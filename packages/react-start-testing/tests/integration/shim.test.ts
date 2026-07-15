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
      .validator((input: { value: number }) => input)
      .handler(({ data }) => ({ value: data.value * 2 }));

    await expect(serverFn({ data: { value: 21 } })).resolves.toStrictEqual({ value: 42 });
  });

  it('supports the deprecated inputValidator alias on server functions', async () => {
    const serverFn = createServerFn({ method: 'POST' })
      // eslint-disable-next-line typescript/no-deprecated -- regression coverage for the deprecated alias, which upstream still ships
      .inputValidator((input: { value: number }) => input)
      .handler(({ data }) => ({ value: data.value * 2 }));

    await expect(serverFn({ data: { value: 21 } })).resolves.toStrictEqual({ value: 42 });
  });

  it('runs function-middleware validators declared via validator()', async () => {
    const doubleMiddleware = createMiddleware({ type: 'function' })
      .validator((input: { value: number }) => ({ value: input.value * 2 }))
      .server(({ next, data }) => next({ context: { doubled: data.value } }));
    const serverFn = createServerFn({ method: 'POST' })
      .middleware([doubleMiddleware])
      .handler(({ context }) => context.doubled);

    await expect(serverFn({ data: { value: 21 } })).resolves.toBe(42);
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
      .handler(({ context }) => context.userId);

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

describe('h3-backed server-shim delegation', () => {
  afterEach(() => {
    clearAllServerFnMocks();
    clearAllMiddlewareMocks();
    __resetServerFnRegistry();
    __resetMiddlewareRegistry();
    setEnv(undefined);
  });

  it('setCookie inside runtime.run() appears in lastResponse', async () => {
    const runtime = await createStartTestRuntime({
      request: 'http://localhost/test',
    });

    await runtime.run(async () => {
      const { setCookie } = await import('../../src/server-shim.ts');
      setCookie('session', 'abc123');
      setCookie('theme', 'dark', { path: '/' });
    });

    const response = runtime.lastResponse;
    expect(response).toBeDefined();
    // eslint-disable-next-line typescript-eslint/no-non-null-assertion -- guarded by assertion above
    const cookies = response!.headers.getSetCookie();
    expect(cookies.some(c => c.includes('session=abc123'))).toBeTruthy();
    expect(cookies.some(c => c.includes('theme=dark'))).toBeTruthy();
    runtime.cleanup();
  });

  it('getCookie reads cookies from the test Request', async () => {
    const request = new Request('http://localhost/', {
      headers: { cookie: 'token=xyz; lang=en' },
    });
    const runtime = await createStartTestRuntime({ request });

    const result = await runtime.run(async () => {
      const { getCookie, getCookies } = await import('../../src/server-shim.ts');
      return { token: getCookie('token'), all: getCookies() };
    });

    expect(result.token).toBe('xyz');
    expect(result.all).toStrictEqual({ token: 'xyz', lang: 'en' });
    runtime.cleanup();
  });

  it('setResponseStatus inside runtime.run() persists in lastResponse', async () => {
    const runtime = await createStartTestRuntime();

    await runtime.run(async () => {
      const { setResponseStatus, getResponseStatus } = await import('../../src/server-shim.ts');
      setResponseStatus(201, 'Created');
      expect(getResponseStatus()).toBe(201);
    });

    expect(runtime.lastResponse?.status).toBe(201);
    expect(runtime.lastResponse?.statusText).toBe('Created');
    runtime.cleanup();
  });

  it('setResponseHeader inside runtime.run() is readable via getResponseHeader', async () => {
    const runtime = await createStartTestRuntime();

    await runtime.run(async () => {
      const { setResponseHeader, getResponseHeader } = await import('../../src/server-shim.ts');
      setResponseHeader('x-request-id', 'test-123');
      expect(getResponseHeader('x-request-id')).toBe('test-123');
    });

    expect(runtime.lastResponse?.headers.get('x-request-id')).toBe('test-123');
    runtime.cleanup();
  });

  it('lastResponse is undefined before first run', async () => {
    const runtime = await createStartTestRuntime();
    expect(runtime.lastResponse).toBeUndefined();
    runtime.cleanup();
  });

  it('lastResponse snapshots on throw', async () => {
    const runtime = await createStartTestRuntime();
    await expect(
      runtime.run(async () => {
        const { setResponseStatus } = await import('../../src/server-shim.ts');
        setResponseStatus(500);
        throw new Error('handler failed');
      }),
    ).rejects.toThrow('handler failed');

    expect(runtime.lastResponse?.status).toBe(500);
    runtime.cleanup();
  });

  it('cleanup resets lastResponse', async () => {
    const runtime = await createStartTestRuntime();
    await runtime.run(async () => {});
    expect(runtime.lastResponse).toBeDefined();
    runtime.cleanup();
    expect(runtime.lastResponse).toBeUndefined();
  });
});
