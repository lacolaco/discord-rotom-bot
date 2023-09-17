import { Hono } from 'hono';
import DiscordClient from './discord/api';
import { notifyNews } from './news';
import { initSentry } from './observability/sentry';

type Env = {
  SENTRY_DSN: string;
  NEWS_KV: KVNamespace;
  DISCORD_TOKEN: string;
  NEWS_NOTIFICATION_CHANNEL_ID: string;
  NEWS_SUBSCRIBER_ROLE_ID: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.text('Hello Cloudflare Workers!'));

async function runCronJob(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
) {
  const discord = new DiscordClient(env.DISCORD_TOKEN);
  await notifyNews(
    env.NEWS_KV,
    discord,
    env.NEWS_SUBSCRIBER_ROLE_ID,
    env.NEWS_NOTIFICATION_CHANNEL_ID,
  );
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
