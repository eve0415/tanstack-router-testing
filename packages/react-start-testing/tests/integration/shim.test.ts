import type { AnyFn } from '@tanstack-router-testing/router-testing-core';

import {
  __resetMiddlewareRegistry,
  __resetServerFnRegistry,
  clearAllMiddlewareMocks,
  clearAllServerFnMocks,
  setEnv,
} from '@tanstack-router-testing/router-testing-core';
import { afterEach, describe, expect, it } from 'vitest';

import { createStartTestRuntime, mockMiddleware, mockServerFn, runInStartEnv } from '../../src/index.ts';
import { createIsomorphicFn, createMiddleware, createServerFn, createStart } from '../../src/shim.ts';

describe('react-start-testing shim', () => {
  afterEach(() => {
    clearAllServerFnMocks();
    clearAllMiddlewareMocks();
    __resetServerFnRegistry();
    __resetMiddlewareRegistry();
    setEnv(undefined);
  });

  it('auto-registers createServerFn handlers for direct callable execution', async () => {
    const serverFn = createServerFn({ method: 'POST' })
      .inputValidator((input: { value: number }) => input)
      .handler(({ data }) => ({ value: data.value * 2 }));

    await expect(serverFn({ data: { value: 21 } })).resolves.toStrictEqual({ value: 42 });
  });

  it('applies mockServerFn to direct callable execution', async () => {
    const serverFn = createServerFn().handler((): string => 'real');
    const restore = mockServerFn(serverFn, () => Promise.resolve('mock'));

    await expect(runInStartEnv('client', () => serverFn())).resolves.toBe('mock');
    restore();
    await expect(runInStartEnv('client', () => serverFn())).resolves.toBe('real');
  });

  it('executes and mocks function middleware during server dispatch', async () => {
    const authMiddleware = createMiddleware({ type: 'function' }).server(({ next, context }) =>
      next({ context: { ...(context as unknown as Record<string, unknown>), userId: 'real-user' } }),
    );
    const serverFn = createServerFn()
      .middleware([authMiddleware])
      .handler(({ context }) => (context as unknown as { userId: string }).userId);

    await expect(serverFn()).resolves.toBe('real-user');

    const restore = mockMiddleware(authMiddleware, {
      server: (({ next }: { next: (ctx: unknown) => unknown }) => next({ context: { userId: 'mock-user' } })) as AnyFn,
    });
    await expect(serverFn()).resolves.toBe('mock-user');
    restore();
  });

  it('dispatches createIsomorphicFn branches through runInStartEnv', async () => {
    const getRuntime = createIsomorphicFn()
      .server(() => 'server')
      .client(() => 'client');

    await expect(runInStartEnv('server', () => getRuntime())).resolves.toBe('server');
    await expect(runInStartEnv('client', () => getRuntime())).resolves.toBe('client');
  });

  it('registers createStart function middleware for server functions', async () => {
    const globalMiddleware = createMiddleware({ type: 'function' }).server(({ next }) => next({ context: { globalUser: 'u1' } }));
    createStart(() => ({ functionMiddleware: [globalMiddleware] }));

    const serverFn = createServerFn().handler(({ context }) => (context as unknown as { globalUser: string }).globalUser);

    await expect(serverFn()).resolves.toBe('u1');
  });

  it('runs server functions inside a request-scoped Start runtime', async () => {
    const requestMiddleware = createMiddleware({ type: 'request' }).server(({ next, request }) =>
      next({ context: { pathname: new URL(request.url).pathname } }),
    );
    const startInstance = createStart(() => ({ requestMiddleware: [requestMiddleware] }));
    const serverFn = createServerFn().handler(({ context }) => (context as unknown as { pathname: string }).pathname);
    const runtime = await createStartTestRuntime({
      startInstance,
      request: 'http://tanstack-router-testing.test/runtime',
    });

    await expect(runtime.run(() => serverFn())).resolves.toBe('/runtime');
  });
});
