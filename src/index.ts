import { Hono, MiddlewareHandler } from 'hono';
import DiscordClient from './discord/api';
import {
  Interaction,
  onInteractionRequest,
  verifyKey,
} from './discord/interactions';
import { notifyNews } from './news';
import { initSentry } from './observability/sentry';

type Env = {
  SENTRY_DSN: string;
  NEWS_KV: KVNamespace;
  DISCORD_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  NEWS_NOTIFICATION_CHANNEL_ID: string;
  NEWS_SUBSCRIBER_ROLE_ID: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.text('Hello!'));

const verifyKeyMiddleware =
  (): MiddlewareHandler<{ Bindings: Env }> => async (c, next) => {
    const signature = c.req.header('X-Signature-Ed25519');
    const timestamp = c.req.header('X-Signature-Timestamp');
    const body = await c.req.raw.clone().text();
    const isValidRequest =
      signature &&
      timestamp &&
      verifyKey(body, signature, timestamp, c.env.DISCORD_PUBLIC_KEY);
    if (!isValidRequest) {
      console.log('Invalid request signature');
      return c.text('Bad request signature', 401);
    }
    return await next();
  };

/**
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#interactions
 */
app.post('/api/interactions', verifyKeyMiddleware(), async (c) => {
  const interaction = await c.req.json<Interaction>();
  const response = await onInteractionRequest(interaction);
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
  const discord = new DiscordClient(env.DISCORD_TOKEN);
  await notifyNews(
    env.NEWS_KV,
    discord,
    env.NEWS_SUBSCRIBER_ROLE_ID,
    env.NEWS_NOTIFICATION_CHANNEL_ID,
  );
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const sentry = initSentry(env.SENTRY_DSN, ctx, request);
    try {
      return await app.fetch(request, env, ctx);
    } catch (e) {
      sentry.captureException(e);
      throw e;
    }
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
