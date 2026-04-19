/**
 * Environment simulation for TanStack Start's isomorphic code paths.
 *
 * TanStack Start's production build uses a Babel/OXC transform in
 * `@tanstack/start-plugin-core` to tree-shake `createIsomorphicFn().server()`
 * vs. `.client()` branches per output bundle. That transform runs at build
 * time; under Vitest, both branches live in the same module graph and the
 * selected branch depends on a runtime flag.
 *
 * {@link runInEnv} flips that flag around the callback, so tests can exercise
 * the server or client branch deterministically, and {@link assertParity} can
 * run both and compare results.
 *
 * @packageDocumentation
 */

/**
 * The environments an isomorphic function can run under.
 *
 * - `server` — server-only code paths (e.g., direct DB access, filesystem).
 * - `client` — client-only code paths (e.g., `fetch()` to an API route).
 */
export type TestEnv = 'server' | 'client';

/**
 * Unique symbol under which the current environment is stored on
 * `globalThis`. `Symbol.for` ensures that multiple copies of this module
 * (pnpm hoisting, nested installs) share the same slot.
 *
 * @internal
 */
const ENV_SLOT = Symbol.for('@tanstack-router-testing/env');

type GlobalWithEnv = typeof globalThis & {
  [ENV_SLOT]?: TestEnv | undefined;
};

/**
 * Read the currently-simulated environment.
 *
 * @returns The current {@link TestEnv}, or `undefined` if none is set.
 *
 * @example
 * ```ts
 * import { getEnv, runInEnv } from '@tanstack-router-testing/router-testing-core';
 *
 * await runInEnv('server', () => {
 *   expect(getEnv()).toBe('server');
 * });
 * expect(getEnv()).toBeUndefined();
 * ```
 */
export const getEnv = (): TestEnv | undefined => (globalThis as GlobalWithEnv)[ENV_SLOT];

/**
 * Imperatively set the current environment.
 *
 * Prefer {@link runInEnv} over this — it guarantees restoration after the
 * scope ends, even when the callback throws. Direct calls to `setEnv` are
 * intended for test-lifecycle hooks (e.g., `beforeEach`/`afterEach`) where
 * the caller manages restoration explicitly.
 *
 * @param env - The environment to simulate, or `undefined` to clear.
 */
export const setEnv = (env: TestEnv | undefined): void => {
  (globalThis as GlobalWithEnv)[ENV_SLOT] = env;
};

/**
 * Run `fn` under a fixed environment, then restore the previous value.
 *
 * Restoration happens whether `fn` resolves, rejects, or throws
 * synchronously.
 *
 * @typeParam T - The return type of `fn`.
 * @param env - The environment to simulate for the duration of `fn`.
 * @param fn - The callback to execute. May return a value or a `Promise`.
 * @returns A promise resolving to the value returned (or resolved) by `fn`.
 *
 * @example
 * ```ts
 * const data = await runInEnv('server', async () => {
 *   return db.users.findMany();
 * });
 * ```
 *
 * @remarks
 * Nested `runInEnv` calls work: each call saves and restores the exact
 * prior value (which may itself be another env).
 */
export const runInEnv = async <T>(env: TestEnv, fn: () => T | Promise<T>): Promise<T> => {
  const prior = getEnv();
  setEnv(env);
  try {
    return await fn();
  } finally {
    setEnv(prior);
  }
};
