import type { TestEnv } from '@tanstack-router-testing/router-testing-core';

import { runInEnv } from '@tanstack-router-testing/router-testing-core';

/**
 * Run `fn` with the simulated Start environment forced to `env`, then restore
 * the prior value.
 */
export const runInStartEnv = async <T>(env: TestEnv, fn: () => T | Promise<T>): Promise<T> => runInEnv(env, fn);
