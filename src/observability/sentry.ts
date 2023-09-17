import { Toucan, Transaction } from 'toucan-js';

export type Sentry = Toucan;

export function initSentry(
  dsn: string,
  context: ExecutionContext,
  request?: Request,
) {
  const sentry = new Toucan({
    dsn,
    context,
    request,
    environment: process.env.NODE_ENV ?? 'production',
    integrations: [new Transaction()],
  });
  return sentry;
}
