import { expectTypeOf } from 'vitest';

import { createRscTestRuntime, createStartTestRuntime } from '../src/index.ts';
import type { RscRenderResult, RscTestRuntime, StartTestRuntime } from '../src/index.ts';

// createStartTestRuntime returns a Promise<StartTestRuntime>.
expectTypeOf(createStartTestRuntime).returns.resolves.toExtend<StartTestRuntime>();

// StartTestRuntime.run preserves return type.
type RunReturn = StartTestRuntime['run'];
expectTypeOf<RunReturn>().toBeFunction();

// StartTestRuntime.call preserves return type.
type CallReturn = StartTestRuntime['call'];
expectTypeOf<CallReturn>().toBeFunction();

// cleanup is a void function.
expectTypeOf<StartTestRuntime['cleanup']>().toEqualTypeOf<() => void>();

// createRscTestRuntime returns a Promise<RscTestRuntime>.
expectTypeOf(createRscTestRuntime).returns.resolves.toExtend<RscTestRuntime>();

// RscTestRuntime extends StartTestRuntime.
expectTypeOf<RscTestRuntime>().toExtend<StartTestRuntime>();

// RscRenderResult has the expected shape.
expectTypeOf<RscRenderResult['html']>().toBeString();
expectTypeOf<RscRenderResult['stream']>().toEqualTypeOf<ReadableStream<Uint8Array> | null>();
expectTypeOf<RscRenderResult['chunks']>().toEqualTypeOf<readonly string[]>();
