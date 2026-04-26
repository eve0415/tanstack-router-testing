import { clearStartMocks, createStartTestRuntime, mockServerFn } from '@tanstack-router-testing/react-start-testing';
// NOTE: Requires the Vite plugin from '@tanstack-router-testing/react-start-testing/vite'
// so that `@tanstack/react-start` imports resolve to the test shim.
// See tanstackStartTesting() in your vitest/vite config.
import { createServerFn } from '@tanstack/react-start';
import { afterEach, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Server functions under test
// ---------------------------------------------------------------------------

const listOrders = createServerFn()
  .validator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    // In production this would hit a database
    return [{ id: 'real-1', userId: data.userId, total: 100 }];
  });

const getUser = createServerFn().handler(async () => {
  // In production this would read from session/cookies
  return { id: 'user-1', name: 'Alice' };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mockServerFn', () => {
  afterEach(() => {
    clearStartMocks();
  });

  it('replaces the server function implementation', async () => {
    const runtime = await createStartTestRuntime({ env: 'server' });

    mockServerFn(listOrders, async ({ data }) => [
      { id: 'mock-1', userId: data.userId, total: 0 },
      { id: 'mock-2', userId: data.userId, total: 50 },
    ]);

    const orders = await runtime.call(listOrders, [{ data: { userId: 'u42' } }]);

    expect(orders).toEqual([
      { id: 'mock-1', userId: 'u42', total: 0 },
      { id: 'mock-2', userId: 'u42', total: 50 },
    ]);

    runtime.cleanup();
  });

  it('mocks a no-argument server function', async () => {
    const runtime = await createStartTestRuntime({ env: 'server' });

    mockServerFn(getUser, async () => ({
      id: 'test-user',
      name: 'Test User',
    }));

    const user = await runtime.call(getUser, []);
    expect(user).toEqual({ id: 'test-user', name: 'Test User' });

    runtime.cleanup();
  });

  it('returns a disposer that restores the original', async () => {
    const runtime = await createStartTestRuntime({ env: 'server' });

    const dispose = mockServerFn(getUser, async () => ({
      id: 'mocked',
      name: 'Mocked',
    }));

    const mocked = await runtime.call(getUser, []);
    expect(mocked).toEqual({ id: 'mocked', name: 'Mocked' });

    dispose();

    const original = await runtime.call(getUser, []);
    expect(original).toEqual({ id: 'user-1', name: 'Alice' });

    runtime.cleanup();
  });

  it('clearStartMocks removes all mocks at once', async () => {
    const runtime = await createStartTestRuntime({ env: 'server' });

    mockServerFn(getUser, async () => ({ id: 'a', name: 'A' }));
    mockServerFn(listOrders, async () => []);

    clearStartMocks();

    const user = await runtime.call(getUser, []);
    expect(user).toEqual({ id: 'user-1', name: 'Alice' });

    runtime.cleanup();
  });
});

describe('createStartTestRuntime', () => {
  it('provides a request to server functions', async () => {
    const runtime = await createStartTestRuntime({
      request: 'http://localhost:3000/api/orders',
      env: 'server',
    });

    expect(runtime.request.url).toBe('http://localhost:3000/api/orders');
    runtime.cleanup();
  });

  it('runs arbitrary code inside the Start context', async () => {
    const runtime = await createStartTestRuntime({ env: 'server' });

    const result = await runtime.run(() => {
      return 'executed inside Start context';
    });

    expect(result).toBe('executed inside Start context');
    runtime.cleanup();
  });
});
