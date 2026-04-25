import type { TestEnv } from '../src/env.ts';

import { expectTypeOf } from 'vitest';

/**
 * Type-level tests for `router-testing-core/env`. Runs under `tsgo --noEmit`
 * via the package's `test:types` script. `@ts-expect-error` assertions
 * fail the check if the error they anticipate stops appearing (i.e., the
 * type became too loose).
 */
import { getEnv, runInEnv, setEnv } from '../src/env.ts';

// getEnv returns TestEnv | undefined, not `any`.
const current: TestEnv | undefined = getEnv();
void current;

expectTypeOf(getEnv).returns.toEqualTypeOf<TestEnv | undefined>();
expectTypeOf(runInEnv).parameter(0).toEqualTypeOf<TestEnv>();

// setEnv accepts `'server'`, `'client'`, `undefined`.
setEnv('server');
setEnv('client');
setEnv(undefined);

// @ts-expect-error — setEnv rejects unknown env values.
setEnv('staging');

// @ts-expect-error — setEnv rejects non-string non-undefined.
setEnv(42);

// runInEnv propagates the callback's return type.
const resultString: Promise<string> = runInEnv('server', () => 'hello');
void resultString;

const resultNumber: Promise<number> = runInEnv('client', () => Promise.resolve(42));
void resultNumber;

// @ts-expect-error — first arg must be TestEnv.
void runInEnv('staging', () => 1);

// @ts-expect-error — second arg must be a function.
void runInEnv('server', 'not-a-fn');
