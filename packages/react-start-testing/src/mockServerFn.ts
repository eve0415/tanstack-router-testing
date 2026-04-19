import type { AnyFn } from '@tanstack-router-testing/router-testing-core';

import { setServerFnMock } from '@tanstack-router-testing/router-testing-core';

export type AnyServerFn = (...args: never[]) => unknown;

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
 * Install a mock for a Start server function.
 *
 * The mock is authored against the public callable shape, so a server function
 * normally called as `listOrders({ data })` is mocked with that same signature.
 */
export const mockServerFn = <TFn extends AnyServerFn>(fn: TFn, impl: ServerFnMock<TFn>): (() => void) => {
  const handler: AnyFn = (ctx?: unknown) => (impl as AnyFn)(toCallableOptions(ctx));
  return setServerFnMock(fn as unknown as AnyFn, handler);
};
