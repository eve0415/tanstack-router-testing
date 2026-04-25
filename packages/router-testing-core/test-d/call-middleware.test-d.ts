import { expectTypeOf } from 'vitest';

import type { CallMiddlewareOptions, CallMiddlewareResult } from '../src/call-middleware.ts';

import { callMiddleware } from '../src/call-middleware.ts';

// callMiddleware returns a Promise<CallMiddlewareResult>.
expectTypeOf(callMiddleware).returns.resolves.toEqualTypeOf<CallMiddlewareResult>();

// CallMiddlewareOptions.phase is a discriminated union.
expectTypeOf<CallMiddlewareOptions['phase']>().toEqualTypeOf<'server' | 'client'>();

// context is optional.
expectTypeOf<CallMiddlewareOptions['context']>().toEqualTypeOf<unknown | undefined>();

// Result.context is unknown (middleware can return anything).
expectTypeOf<CallMiddlewareResult['context']>().toEqualTypeOf<unknown>();

// @ts-expect-error — phase must be 'server' or 'client'.
void callMiddleware({}, { phase: 'invalid', context: {} });
