import { Sentry } from './observability/types';

export type Env = {
  SENTRY_DSN: string;
  NEWS_KV: KVNamespace;
  DISCORD_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  NEWS_NOTIFICATION_CHANNEL_ID: string;
  NEWS_SUBSCRIBER_ROLE_ID: string;
};

type Variables = {
  sentry: Sentry;
};

export type HonoAppContext = { Bindings: Env; Variables: Variables };
