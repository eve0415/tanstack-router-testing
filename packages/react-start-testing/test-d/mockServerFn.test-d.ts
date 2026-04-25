import { expectTypeOf } from 'vitest';

import { mockServerFn, type AnyServerFn } from '../src/index.ts';

// mockServerFn returns a disposer function.
expectTypeOf(mockServerFn).returns.toEqualTypeOf<() => void>();

// AnyServerFn accepts never[] args (accepts any fn).
expectTypeOf<AnyServerFn>().toBeFunction();
