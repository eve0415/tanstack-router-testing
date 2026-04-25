import type { AnyFn } from './server-fn-registry.ts';

import { getMiddlewareEntry } from './middleware-registry.ts';

/**
 * Options for {@link callMiddleware}.
 */
export interface CallMiddlewareOptions {
  /** Which middleware phase to invoke. */
  readonly phase: 'server' | 'client';
  /** Initial context passed to the middleware. Defaults to `{}`. */
  readonly context?: unknown;
  /** Request object available inside the middleware. Defaults to a synthetic test request. */
  readonly request?: Request;
}

/**
 * Result of calling a middleware in isolation.
 */
export interface CallMiddlewareResult {
  /** The context after the middleware (and its `next()` call) has run. */
  readonly context: unknown;
}

/**
 * Call a registered middleware in isolation, without a full router.
 *
 * Invokes the specified phase (server or client) with a fake `next()` that
 * captures context. Mocks installed via {@link setMiddlewareMock} take
 * precedence over originals.
 *
 * @param mw - The middleware object returned by `createMiddleware`.
 * @param options - Phase, initial context, and optional request.
 * @returns The resolved context after middleware execution.
 *
 * @example
 * ```ts
 * registerMiddleware(authMw, { server: authServerImpl });
 * const result = await callMiddleware(authMw, {
 *   phase: 'server',
 *   context: { user: null },
 * });
 * expect(result.context).toEqual({ user: null, checked: true });
 * ```
 *
 * @remarks
 * The middleware must be registered with {@link registerMiddleware} before
 * calling. If using the Start shim, registration happens automatically at
 * import time.
 */
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

  const next = (ctx?: { readonly context?: unknown }): Promise<{ context: unknown }> => {
    if (ctx?.context !== undefined) {
      finalContext = ctx.context;
    }
    return Promise.resolve({ context: finalContext });
  };

  await impl({
    next,
    context: options.context ?? {},
    request: options.request ?? new Request('http://tanstack-router-testing.test/'),
  });

  return { context: finalContext };
};
