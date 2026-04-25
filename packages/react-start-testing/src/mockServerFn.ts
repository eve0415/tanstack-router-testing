import type { AnyFn } from '@tanstack-router-testing/router-testing-core';

import { setServerFnMock } from '@tanstack-router-testing/router-testing-core';

/**
 * Catch-all type representing any TanStack Start server function.
 *
 * @remarks
 * Used as a generic constraint in {@link mockServerFn} and {@link ServerFnMock}
 * to accept any function created by `createServerFn().handler(...)`.
 */
export type AnyServerFn = (...args: never[]) => unknown;

/**
 * The mock implementation signature for a server function of type `TFn`.
 *
 * @typeParam TFn - The server function type being mocked.
 *
 * @remarks
 * The mock receives the same callable-shape arguments as the real server
 * function (e.g. `{ data }`) and must return a compatible result. Full generic
 * inference is preserved so autocomplete works identically to the real call.
 *
 * @see {@link mockServerFn}
 */
export type ServerFnMock<TFn extends AnyServerFn> = (...args: Parameters<TFn>) => ReturnType<TFn>;

const hasKey = (value: unknown, key: string): boolean => typeof value === 'object' && value !== null && key in value;

const toCallableOptions = (ctx: unknown): unknown => {
  if (!hasKey(ctx, 'data')) return ctx;

  const source = ctx as {
    readonly data?: unknown;
    readonly headers?: HeadersInit;
    readonly signal?: AbortSignal;
    readonly fetch?: typeof globalThis.fetch;
  };

  return {
    data: source.data,
    ...(source.headers !== undefined ? { headers: source.headers } : {}),
    ...(source.signal !== undefined ? { signal: source.signal } : {}),
    ...(source.fetch !== undefined ? { fetch: source.fetch } : {}),
  };
};

/**
 * Install a mock implementation for a TanStack Start server function.
 *
 * @param fn - The server function created by `createServerFn().handler(...)`.
 * @param impl - A {@link ServerFnMock} that replaces the real handler for the
 *   duration of the test. It receives the same callable-shape arguments (e.g.
 *   `{ data }`) as the original function.
 * @returns A disposer function that restores the original implementation when
 *   called. Alternatively, call {@link clearStartMocks} to remove all mocks at
 *   once.
 *
 * @example
 * ```ts
 * import { createServerFn } from '@tanstack/start';
 * import { mockServerFn } from '@tanstack-router-testing/react-start-testing';
 *
 * const listOrders = createServerFn()
 *   .validator((input: { userId: string }) => input)
 *   .handler(async ({ data }) => db.orders.findMany(data.userId));
 *
 * const dispose = mockServerFn(listOrders, async ({ data }) => [
 *   { id: '1', userId: data.userId, total: 42 },
 * ]);
 *
 * // ... run your test ...
 * dispose();
 * ```
 *
 * @remarks
 * The mock is authored against the public callable shape, so a server function
 * normally called as `listOrders({ data })` is mocked with that same signature.
 * Internal context fields are normalised automatically before reaching the mock.
 */
export const mockServerFn = <TFn extends AnyServerFn>(fn: TFn, impl: ServerFnMock<TFn>): (() => void) => {
  const handler: AnyFn = (ctx?: unknown) => (impl as AnyFn)(toCallableOptions(ctx));
  return setServerFnMock(fn as unknown as AnyFn, handler);
};
