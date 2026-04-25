import type { AnyFn } from './server-fn-registry.ts';

import { getMiddlewareEntry } from './middleware-registry.ts';

export interface CallMiddlewareOptions {
  readonly phase: 'server' | 'client';
  readonly context?: unknown;
  readonly request?: Request;
}

export interface CallMiddlewareResult {
  readonly context: unknown;
}

export const callMiddleware = async (mw: object, options: CallMiddlewareOptions): Promise<CallMiddlewareResult> => {
  const entry = getMiddlewareEntry(mw);
  if (!entry) {
    throw new Error(
      '[tanstack-router-testing] Cannot call an unregistered middleware. ' +
        'Register it with registerMiddleware() first.',
    );
  }

  const phase = options.phase;
  const impl: AnyFn | undefined =
    phase === 'server'
      ? (entry.mockServer ?? entry.originalServer)
      : (entry.mockClient ?? entry.originalClient);

  if (!impl) {
    throw new Error(`[tanstack-router-testing] Middleware has no ${phase} phase registered.`);
  }

  let finalContext: unknown = options.context ?? {};

  const next = async (ctx?: { readonly context?: unknown }): Promise<{ context: unknown }> => {
    if (ctx?.context !== undefined) {
      finalContext = ctx.context;
    }
    return { context: finalContext };
  };

  await impl({
    next,
    context: options.context ?? {},
    request: options.request ?? new Request('http://tanstack-router-testing.test/'),
  });

  return { context: finalContext };
};
