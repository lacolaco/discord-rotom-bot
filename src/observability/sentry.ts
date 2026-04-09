import { MiddlewareHandler } from 'hono';
import { Toucan } from 'toucan-js';
import { HonoAppContext } from '../context';

export function initSentry(
  dsn: string,
  context: ExecutionContext,
  request?: Request,
) {
  const sentry = new Toucan({
    dsn,
    context,
    request,
    environment: 'production',
  });
  return sentry;
}

export const sentryMiddleware =
  (): MiddlewareHandler<HonoAppContext> => async (c, next) => {
    const sentry = initSentry(c.env.SENTRY_DSN, c.executionCtx, c.req.raw);
    c.set('sentry', sentry);
    return await next();
  };
