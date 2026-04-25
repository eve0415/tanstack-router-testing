import { expectTypeOf } from 'vitest';

import {
  createRscTestRuntime,
  createStartTestRuntime,
  type RscRenderResult,
  type RscTestRuntime,
  type StartTestRuntime,
} from '../src/index.ts';

// createStartTestRuntime returns a Promise<StartTestRuntime>.
expectTypeOf(createStartTestRuntime).returns.resolves.toMatchTypeOf<StartTestRuntime>();

// StartTestRuntime.run preserves return type.
type RunReturn = StartTestRuntime['run'];
expectTypeOf<RunReturn>().toBeFunction();

// StartTestRuntime.call preserves return type.
type CallReturn = StartTestRuntime['call'];
expectTypeOf<CallReturn>().toBeFunction();

// cleanup is a void function.
expectTypeOf<StartTestRuntime['cleanup']>().toEqualTypeOf<() => void>();

// createRscTestRuntime returns a Promise<RscTestRuntime>.
expectTypeOf(createRscTestRuntime).returns.resolves.toMatchTypeOf<RscTestRuntime>();

// RscTestRuntime extends StartTestRuntime.
expectTypeOf<RscTestRuntime>().toMatchTypeOf<StartTestRuntime>();

// RscRenderResult has the expected shape.
expectTypeOf<RscRenderResult['html']>().toBeString();
expectTypeOf<RscRenderResult['stream']>().toEqualTypeOf<ReadableStream<Uint8Array> | null>();
expectTypeOf<RscRenderResult['chunks']>().toEqualTypeOf<readonly string[]>();
