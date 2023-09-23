import { Hono } from 'hono';
import { Env, HonoAppContext } from './context';
import DiscordApi from './discord/api';
import {
  Interaction,
  handleInteractionRequest,
  verifyKeyMiddleware,
} from './discord/interactions';
import { notifyNews } from './news';
import { initSentry, sentryMiddleware } from './observability/sentry';

const app = new Hono<HonoAppContext>();

app.use('*', sentryMiddleware());

app.onError(async (error, c) => {
  console.error(error);
  const sentry = c.var.sentry;
  if (sentry) {
    sentry.captureException(error);
  }
  return c.text('Internal server error', 500);
});

app.get('/', (c) => c.text('Hello!'));

/**
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#interactions
 */
app.post('/api/interactions', verifyKeyMiddleware(), async (c) => {
  const interaction = await c.req.json<Interaction>();
  const response = await handleInteractionRequest(interaction);
  if (response) {
    return c.json(response);
  } else {
    return c.text('OK', 200);
  }
});

async function runCronJob(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
) {
  const discord = new DiscordApi(env.DISCORD_TOKEN);
  await notifyNews(
    env.NEWS_KV,
    discord,
    env.NEWS_SUBSCRIBER_ROLE_ID,
    env.NEWS_NOTIFICATION_CHANNEL_ID,
  );
}

export default {
  fetch: app.fetch,
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
