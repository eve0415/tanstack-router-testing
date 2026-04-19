/**
 * Runtime registry for server functions created with
 * `@tanstack/react-start`'s `createServerFn(...).handler(...)`.
 *
 * The registry exists so the Start testing runtime and
 * {@link @tanstack-router-testing/react-start-testing!mockServerFn} can:
 *
 * - find the original handler for any server-fn reference, and
 * - swap that handler for a test-only mock, then restore it.
 *
 * This package is framework-agnostic and therefore types the key and
 * handler as `AnyFn`; the {@link @tanstack-router-testing/react-start-testing!} package
 * re-exposes the same registry through strongly-typed helpers.
 *
 * @packageDocumentation
 */

/**
 * Loose shape of any server-fn handler or server-fn callable. Concrete
 * typing lives in `@tanstack-router-testing/react-start-testing`.
 */
export type AnyFn = (...args: readonly unknown[]) => unknown;

/**
 * Registry entry for a single server function.
 */
export interface ServerFnEntry {
  /**
   * The original handler registered at module load via
   * `createServerFn(...).handler(original)`. Never mutated after
   * registration.
   */
  readonly original: AnyFn;
  /**
   * If set, in-process dispatch calls the `mock` instead of `original`
   * until {@link setServerFnMock} is called again with `undefined` or
   * {@link clearAllServerFnMocks} runs.
   */
  mock: AnyFn | undefined;
}

const registry = new Map<AnyFn, ServerFnEntry>();

/**
 * Register a server function so tests can find, mock, or invoke its
 * original handler. Idempotent: registering the same `fn` twice returns
 * the existing entry.
 *
 * @param fn - The server-fn callable (the value returned by
 *             `createServerFn(...).handler(original)`).
 * @param original - The original handler that was passed to `.handler()`.
 * @returns The registry entry for `fn`.
 *
 * @example
 * ```ts
 * const listOrders = createServerFn({ method: 'GET' }).handler(listOrdersImpl);
 * registerServerFn(listOrders, listOrdersImpl);
 * ```
 */
export const registerServerFn = (fn: AnyFn, original: AnyFn): ServerFnEntry => {
  const existing = registry.get(fn);
  if (existing) return existing;
  const entry: ServerFnEntry = { original, mock: undefined };
  registry.set(fn, entry);
  return entry;
};

/**
 * Fetch a server-fn's registry entry.
 *
 * @param fn - The server-fn callable.
 * @returns The entry, or `undefined` if `fn` was never registered (e.g.,
 *          the plugin that populates the registry wasn't installed).
 */
export const getServerFnEntry = (fn: AnyFn): ServerFnEntry | undefined => registry.get(fn);

/**
 * Install a mock handler for a server function. Returns a disposer that
 * restores the prior mock (or clears it) when called.
 *
 * @param fn - The server-fn callable to mock.
 * @param mock - The replacement handler. Pass `undefined` to clear the mock.
 * @returns A no-arg function that restores the prior state.
 *
 * @throws If `fn` has not been registered. Mocking an unregistered fn
 *         would silently no-op, which is almost never what the caller
 *         wants — better to surface the missing plugin or import.
 *
 * @example
 * ```ts
 * const restore = setServerFnMock(listOrders, async () => [{ id: 1 }]);
 * // ... test body ...
 * restore();
 * ```
 */
export const setServerFnMock = (fn: AnyFn, mock: AnyFn | undefined): (() => void) => {
  const entry = registry.get(fn);
  if (!entry) {
    throw new Error(
      '[tanstack-router-testing] Cannot mock an unregistered server fn. ' +
        'Ensure router-testing-plugin (or equivalent) is active so server fns are registered at import time.',
    );
  }
  const prior = entry.mock;
  entry.mock = mock;
  return () => {
    entry.mock = prior;
  };
};

/**
 * Clear every registered mock. Typically called from a Vitest `afterEach`
 * hook to prevent test bleed.
 *
 * Does **not** unregister the fns themselves — originals are preserved so
 * subsequent tests see the same registry state the plugin produced at
 * import time.
 */
export const clearAllServerFnMocks = (): void => {
  for (const entry of registry.values()) {
    entry.mock = undefined;
  }
};

/**
 * Remove **every** registered server fn from the registry, including
 * originals. Intended for test-harness teardown across full test runs;
 * production code paths never call this.
 *
 * @internal
 */
export const __resetServerFnRegistry = (): void => {
  registry.clear();
};
