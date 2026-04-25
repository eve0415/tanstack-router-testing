import type { TestEnv } from '@tanstack-router-testing/router-testing-core';

import { runInEnv } from '@tanstack-router-testing/router-testing-core';

/**
 * Execute `fn` with the simulated TanStack Start environment forced to `env`,
 * then restore the prior value.
 *
 * @typeParam T - The return type of `fn`.
 * @param env - The environment to simulate: `'server'` or `'client'`.
 * @param fn - A synchronous or asynchronous function to run inside the
 *   simulated environment.
 * @returns A `Promise` resolving to the return value of `fn`.
 *
 * @example
 * ```ts
 * import { runInStartEnv } from '@tanstack-router-testing/react-start-testing';
 *
 * const result = await runInStartEnv('server', () => {
 *   // Code here sees `import.meta.env.SSR === true`
 *   return fetchDataOnServer();
 * });
 * ```
 *
 * @remarks
 * The environment is scoped to the execution of `fn` and is restored
 * automatically even if `fn` throws. Used internally by
 * {@link createStartTestRuntime} to set the environment for each
 * {@link StartTestRuntime.run | run} invocation.
 */
export const runInStartEnv = async <T>(env: TestEnv, fn: () => T | Promise<T>): Promise<T> => runInEnv(env, fn);
