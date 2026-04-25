import { afterEach, describe, expect, it } from 'vitest';

import { __resetMiddlewareRegistry, registerMiddleware, setMiddlewareMock } from './middleware-registry.ts';
import { callMiddleware } from './call-middleware.ts';

describe('callMiddleware', () => {
  afterEach(() => {
    __resetMiddlewareRegistry();
  });

  it('calls server phase with context and returns merged result', async () => {
    const mw = {};
    registerMiddleware(mw, {
      server: async ({ next, context }: { next: (ctx?: { context?: unknown }) => Promise<unknown>; context: unknown }) =>
        next({ context: { ...(context as Record<string, unknown>), added: true } }),
    });

    const result = await callMiddleware(mw, {
      phase: 'server',
      context: { existing: 'value' },
    });
    expect(result.context).toEqual({ existing: 'value', added: true });
  });

  it('calls client phase', async () => {
    const mw = {};
    registerMiddleware(mw, {
      client: async ({ next, context }: { next: (ctx?: { context?: unknown }) => Promise<unknown>; context: unknown }) =>
        next({ context: { ...(context as Record<string, unknown>), client: true } }),
    });

    const result = await callMiddleware(mw, { phase: 'client', context: {} });
    expect(result.context).toEqual({ client: true });
  });

  it('throws if middleware not registered', async () => {
    const mw = {};
    await expect(callMiddleware(mw, { phase: 'server', context: {} })).rejects.toThrow('unregistered');
  });

  it('throws if requested phase does not exist', async () => {
    const mw = {};
    registerMiddleware(mw, { server: async ({ next }: { next: () => Promise<unknown> }) => next() });
    await expect(callMiddleware(mw, { phase: 'client', context: {} })).rejects.toThrow('no client phase');
  });

  it('uses mock phase when set', async () => {
    const mw = {};
    registerMiddleware(mw, {
      server: async ({ next }: { next: () => Promise<unknown> }) => next(),
    });
    setMiddlewareMock(mw, {
      server: async ({ next, context }: { next: (ctx?: { context?: unknown }) => Promise<unknown>; context: unknown }) =>
        next({ context: { ...(context as Record<string, unknown>), mocked: true } }),
    });

    const result = await callMiddleware(mw, { phase: 'server', context: {} });
    expect(result.context).toEqual({ mocked: true });
  });

  it('provides a default request when none given', async () => {
    const mw = {};
    let receivedRequest: Request | undefined;
    registerMiddleware(mw, {
      server: async ({ next, request }: { next: () => Promise<unknown>; request: Request }) => {
        receivedRequest = request;
        return next();
      },
    });

    await callMiddleware(mw, { phase: 'server', context: {} });
    expect(receivedRequest).toBeInstanceOf(Request);
  });

  it('uses provided request', async () => {
    const mw = {};
    let receivedUrl: string | undefined;
    registerMiddleware(mw, {
      server: async ({ next, request }: { next: () => Promise<unknown>; request: Request }) => {
        receivedUrl = request.url;
        return next();
      },
    });

    const request = new Request('http://example.com/test');
    await callMiddleware(mw, { phase: 'server', context: {}, request });
    expect(receivedUrl).toBe('http://example.com/test');
  });
});
