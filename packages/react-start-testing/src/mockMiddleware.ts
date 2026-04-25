import type { AnyFn } from '@tanstack-router-testing/router-testing-core';

import { setMiddlewareMock } from '@tanstack-router-testing/router-testing-core';

/**
 * Phase override options for {@link mockMiddleware}.
 *
 * @remarks
 * Provide `client`, `server`, or both. Omitted keys leave the corresponding
 * phase untouched, so you can mock only the server side without affecting the
 * client phase and vice-versa.
 */
export interface MockMiddlewareOptions {
  /** Override for the `.client()` phase. When omitted the real client handler runs. */
  readonly client?: AnyFn;
  /** Override for the `.server()` phase. When omitted the real server handler runs. */
  readonly server?: AnyFn;
}

/**
 * Override one or both phases of a registered middleware.
 *
 * @param mw - The middleware object returned by
 *   `createMiddleware().server(...).client(...)`.
 * @param options - A {@link MockMiddlewareOptions} object specifying which
 *   phases to replace.
 * @returns A disposer function that restores the original middleware handlers.
 *   Alternatively, call {@link clearStartMocks} to remove all mocks at once.
 *
 * @example
 * ```ts
 * import { createMiddleware } from '@tanstack/start';
 * import { mockMiddleware } from '@tanstack-router-testing/react-start-testing';
 *
 * const authMiddleware = createMiddleware()
 *   .server(async ({ next }) => next({ context: { user: await getUser() } }))
 *   .client(async ({ next }) => next());
 *
 * const dispose = mockMiddleware(authMiddleware, {
 *   server: async ({ next }) => next({ context: { user: { id: 'test-user' } } }),
 * });
 *
 * // ... run your test ...
 * dispose();
 * ```
 *
 * @throws If `mw` is not registered. Registration is the shim's
 *   responsibility (see ADR 0001).
 *
 * @remarks
 * Server functions are invoked directly and mocked middleware participates in
 * that normal call path. Only the phases you specify in `options` are replaced;
 * the rest continue to run their real implementations.
 */
export const mockMiddleware = (mw: object, options: MockMiddlewareOptions): (() => void) => setMiddlewareMock(mw, options);
