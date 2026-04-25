import type { AnyFn } from './server-fn-registry.ts';

import { afterEach, describe, expect, it } from 'vitest';

import { __resetMiddlewareRegistry, registerMiddleware, setMiddlewareMock } from './middleware-registry.ts';
import { callMiddleware } from './call-middleware.ts';

describe('callMiddleware', () => {
  afterEach(() => {
    __resetMiddlewareRegistry();
  });

  it('calls server phase with context and returns merged result', async () => {
    const mw = {};
    const serverImpl = (async ({ next, context }: Record<string, unknown>) =>
      (next as (ctx: { context: unknown }) => Promise<unknown>)({
        context: { ...(context as Record<string, unknown>), added: true },
      })) as AnyFn;
    registerMiddleware(mw, { server: serverImpl });

    const result = await callMiddleware(mw, {
      phase: 'server',
      context: { existing: 'value' },
    });
    expect(result.context).toStrictEqual({ existing: 'value', added: true });
  });

  it('calls client phase', async () => {
    const mw = {};
    const clientImpl = (async ({ next, context }: Record<string, unknown>) =>
      (next as (ctx: { context: unknown }) => Promise<unknown>)({
        context: { ...(context as Record<string, unknown>), client: true },
      })) as AnyFn;
    registerMiddleware(mw, { client: clientImpl });

    const result = await callMiddleware(mw, { phase: 'client', context: {} });
    expect(result.context).toStrictEqual({ client: true });
  });

  it('throws if middleware not registered', async () => {
    const mw = {};
    await expect(callMiddleware(mw, { phase: 'server', context: {} })).rejects.toThrow('unregistered');
  });

  it('throws if requested phase does not exist', async () => {
    const mw = {};
    const serverImpl = (async ({ next }: Record<string, unknown>) => (next as () => Promise<unknown>)()) as AnyFn;
    registerMiddleware(mw, { server: serverImpl });
    await expect(callMiddleware(mw, { phase: 'client', context: {} })).rejects.toThrow('no client phase');
  });

  it('uses mock phase when set', async () => {
    const mw = {};
    const originalServer = (async ({ next }: Record<string, unknown>) => (next as () => Promise<unknown>)()) as AnyFn;
    registerMiddleware(mw, { server: originalServer });

    const mockServer = (async ({ next, context }: Record<string, unknown>) =>
      (next as (ctx: { context: unknown }) => Promise<unknown>)({
        context: { ...(context as Record<string, unknown>), mocked: true },
      })) as AnyFn;
    setMiddlewareMock(mw, { server: mockServer });

    const result = await callMiddleware(mw, { phase: 'server', context: {} });
    expect(result.context).toStrictEqual({ mocked: true });
  });

  it('provides a default request when none given', async () => {
    const mw = {};
    let receivedRequest: Request | undefined;
    const serverImpl = (async ({ next, request }: Record<string, unknown>) => {
      receivedRequest = request as Request;
      return (next as () => Promise<unknown>)();
    }) as AnyFn;
    registerMiddleware(mw, { server: serverImpl });

    await callMiddleware(mw, { phase: 'server', context: {} });
    expect(receivedRequest).toBeInstanceOf(Request);
  });

  it('uses provided request', async () => {
    const mw = {};
    let receivedUrl: string | undefined;
    const serverImpl = (async ({ next, request }: Record<string, unknown>) => {
      receivedUrl = (request as Request).url;
      return (next as () => Promise<unknown>)();
    }) as AnyFn;
    registerMiddleware(mw, { server: serverImpl });

    const request = new Request('http://example.com/test');
    await callMiddleware(mw, { phase: 'server', context: {}, request });
    expect(receivedUrl).toBe('http://example.com/test');
  });
});
