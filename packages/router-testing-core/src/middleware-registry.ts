/**
 * Runtime registry for middleware created with
 * `@tanstack/react-start`'s `createMiddleware(...).server(fn).client(fn)`.
 *
 * Mirrors {@link ./server-fn-registry.ts | the server-fn registry}: tests
 * can swap the `server` or `client` phase implementation and restore it.
 * The key is the outer middleware object reference.
 *
 * @packageDocumentation
 */

import type { AnyFn } from './server-fn-registry.ts';

/**
 * Registry entry for a single middleware object.
 */
export interface MiddlewareEntry {
  /**
   * Original `.client()` implementation, if one was registered. `undefined`
   * means the middleware has no client phase.
   */
  readonly originalClient: AnyFn | undefined;
  /**
   * Original `.server()` implementation, if one was registered.
   */
  readonly originalServer: AnyFn | undefined;
  /**
   * If set, replaces the client phase during in-process dispatch.
   */
  mockClient: AnyFn | undefined;
  /**
   * If set, replaces the server phase during in-process dispatch.
   */
  mockServer: AnyFn | undefined;
}

/**
 * Options for {@link setMiddlewareMock}.
 */
export interface MiddlewareMockOptions {
  /** Override for the `.client()` phase. Omit to leave it unchanged. */
  readonly client?: AnyFn;
  /** Override for the `.server()` phase. Omit to leave it unchanged. */
  readonly server?: AnyFn;
}

const registry = new Map<object, MiddlewareEntry>();

/**
 * Register a middleware object so tests can mock its phase implementations.
 * Idempotent: re-registering the same middleware returns the existing entry.
 *
 * @param mw - The middleware object (the value returned by `createMiddleware`).
 * @param phases - The original `.client()` and `.server()` implementations,
 *                 or `undefined` for phases the middleware doesn't provide.
 * @returns The registry entry for `mw`.
 */
export const registerMiddleware = (
  mw: object,
  phases: {
    readonly client?: AnyFn | undefined;
    readonly server?: AnyFn | undefined;
  },
): MiddlewareEntry => {
  const existing = registry.get(mw);
  if (existing) return existing;
  const entry: MiddlewareEntry = {
    originalClient: phases.client,
    originalServer: phases.server,
    mockClient: undefined,
    mockServer: undefined,
  };
  registry.set(mw, entry);
  return entry;
};

/**
 * Fetch a middleware's registry entry.
 *
 * @param mw - The middleware object.
 * @returns The entry, or `undefined` if `mw` was never registered.
 */
export const getMiddlewareEntry = (mw: object): MiddlewareEntry | undefined => registry.get(mw);

/**
 * Override one or both phases of a middleware. Returns a disposer that
 * restores the prior phase values.
 *
 * @param mw - The middleware object to mock.
 * @param options - Phase replacements. Provided keys are swapped;
 *                  omitted keys are left untouched.
 * @returns A no-arg function that restores the prior state.
 *
 * @throws If `mw` has not been registered.
 *
 * @example
 * ```ts
 * const restore = setMiddlewareMock(authMw, {
 *   server: async ({ next, context }) =>
 *     next({ context: { ...context, user: { id: 'u1' } } }),
 * });
 * // ... test body ...
 * restore();
 * ```
 */
export const setMiddlewareMock = (mw: object, options: MiddlewareMockOptions): (() => void) => {
  const entry = registry.get(mw);
  if (!entry) {
    throw new Error(
      '[tanstack-router-testing] Cannot mock an unregistered middleware. ' +
        'Ensure router-testing-plugin (or equivalent) is active so middleware is registered at import time.',
    );
  }
  const priorClient = entry.mockClient;
  const priorServer = entry.mockServer;
  if (options.client !== undefined) entry.mockClient = options.client;
  if (options.server !== undefined) entry.mockServer = options.server;
  return () => {
    entry.mockClient = priorClient;
    entry.mockServer = priorServer;
  };
};

/**
 * Clear every registered middleware mock (both client and server phases).
 * Originals are preserved.
 */
export const clearAllMiddlewareMocks = (): void => {
  for (const entry of registry.values()) {
    entry.mockClient = undefined;
    entry.mockServer = undefined;
  }
};

/**
 * Remove every registered middleware, including originals. Intended for
 * test-harness teardown.
 *
 * @internal
 */
export const __resetMiddlewareRegistry = (): void => {
  registry.clear();
};
