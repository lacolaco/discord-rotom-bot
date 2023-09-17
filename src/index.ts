import { Hono } from 'hono';
import { fetchNewsJSON } from './news/fetch';
import { isOngoingNews } from './news/utils';
import { createNotificationMessage } from './news/notification';
import { sendMessageByWebhook } from './discord/api';
import { initSentry } from './observability/sentry';

type Env = {
  SENTRY_DSN: string;
  NEWS_KV: KVNamespace;
  DIRCORD_NEWS_NOTIFICATION_WEBHOOK_URL: string;
  NEWS_SUBSCRIBER_ROLE_ID: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.text('Hello Cloudflare Workers!'));

async function runCronJob(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
) {
  const { data: news } = await fetchNewsJSON();

  const newsToNotify = [];
  for (const item of news) {
    // check a news item is available
    if (!isOngoingNews(item)) {
      console.log(`News item ${item.id} is not ongoing`);
      continue;
    }
    // check a news item is not in the database
    const exists = await env.NEWS_KV.get(item.id);
    if (exists) {
      console.log(`News item ${item.id} is already notified`);
      continue;
    }
    // save a news item to the database
    await env.NEWS_KV.put(item.id, JSON.stringify(item));

    newsToNotify.push(item);
  }

  if (newsToNotify.length === 0) {
    console.log('No new news');
    return;
  }

  const message = createNotificationMessage(
    newsToNotify,
    env.NEWS_SUBSCRIBER_ROLE_ID,
  );

  await sendMessageByWebhook(
    env.DIRCORD_NEWS_NOTIFICATION_WEBHOOK_URL,
    message,
  );

  return console.log(JSON.stringify(newsToNotify));
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    initSentry(env.SENTRY_DSN, ctx, request);
    return app.fetch(request, env, ctx);
  },
  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const sentry = initSentry(env.SENTRY_DSN, ctx);
    sentry.setContext('event', event);
    ctx.waitUntil(
      runCronJob(event, env, ctx).catch((e) => {
        sentry.captureException(e);
      }),
    );
  },
};
