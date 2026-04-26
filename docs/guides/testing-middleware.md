# Mocking and Isolating Middleware

## Problem

TanStack Start middleware runs in two phases (server and client) and modifies context for downstream server functions. You need to mock individual phases for integration tests and invoke middleware in isolation for unit tests.

## Setup

```ts
import { mockMiddleware, callMiddleware, clearStartMocks } from '@tanstack-router-testing/react-start-testing';
import { createMiddleware } from '@tanstack/react-start';
import { describe, it, expect, afterEach } from 'vitest';
```

## Mocking Middleware with mockMiddleware

`mockMiddleware(mw, { server?, client? })` replaces one or both phases. Omitted phases keep their real implementation.

```ts
const authMiddleware = createMiddleware()
  .server(async ({ next }) => {
    const user = await getSessionUser(); // hits a real auth service
    return next({ context: { user } });
  })
  .client(async ({ next }) => next());

describe('with mocked auth middleware', () => {
  afterEach(() => {
    clearStartMocks();
  });

  it('injects a test user into context', async () => {
    const dispose = mockMiddleware(authMiddleware, {
      server: async ({ next }) => next({ context: { user: { id: 'test-user', role: 'admin' } } }),
    });

    // Server functions that use this middleware now see the mocked user.
    // The client phase is untouched since we only specified `server`.

    dispose();
  });
});
```

## Isolated Middleware Testing with callMiddleware

`callMiddleware(mw, { phase, context?, request? })` runs a single phase of the middleware without a full router or server function call chain. It captures the context produced by the middleware's `next()` call.

```ts
const loggingMiddleware = createMiddleware().server(async ({ next, context }) => {
  // Imagine this logs and enriches context
  return next({ context: { ...context, requestId: 'req-123' } });
});

describe('loggingMiddleware server phase', () => {
  it('adds requestId to context', async () => {
    const result = await callMiddleware(loggingMiddleware, {
      phase: 'server',
      context: { existingKey: 'value' },
    });

    expect(result.context).toEqual({
      existingKey: 'value',
      requestId: 'req-123',
    });
  });

  it('works with a custom request', async () => {
    const result = await callMiddleware(loggingMiddleware, {
      phase: 'server',
      context: {},
      request: new Request('http://localhost:3000/api/test'),
    });

    expect(result.context).toHaveProperty('requestId');
  });
});
```

## Middleware Context Merging

When middleware calls `next({ context: { ... } })`, the new context is merged with the existing context. This is how middleware chains build up a shared context object.

```ts
const tenantMiddleware = createMiddleware().server(async ({ next, context }) => {
  return next({
    context: { ...context, tenantId: 'tenant-abc' },
  });
});

const permissionsMiddleware = createMiddleware().server(async ({ next, context }) => {
  return next({
    context: { ...context, permissions: ['read'] },
  });
});

describe('middleware context chaining', () => {
  it('tenant middleware adds tenantId', async () => {
    const result = await callMiddleware(tenantMiddleware, {
      phase: 'server',
      context: { user: { id: 'u1' } },
    });

    expect(result.context).toEqual({
      user: { id: 'u1' },
      tenantId: 'tenant-abc',
    });
  });

  it('permissions middleware adds permissions', async () => {
    // Simulate the context that would exist after tenantMiddleware
    const result = await callMiddleware(permissionsMiddleware, {
      phase: 'server',
      context: { user: { id: 'u1' }, tenantId: 'tenant-abc' },
    });

    expect(result.context).toEqual({
      user: { id: 'u1' },
      tenantId: 'tenant-abc',
      permissions: ['read'],
    });
  });
});
```

## Combining Mocked Middleware with Server Functions

Mock the middleware, then test the server function that depends on it.

```ts
import { mockServerFn } from '@tanstack-router-testing/react-start-testing';

const getOrders = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // context.user comes from authMiddleware
    return db.orders.findMany({ userId: context.user.id });
  });

it('server function receives mocked middleware context', async () => {
  mockMiddleware(authMiddleware, {
    server: async ({ next }) => next({ context: { user: { id: 'mock-user' } } }),
  });

  mockServerFn(getOrders, async ({ context }) => {
    // Verify the mock user was injected
    return [{ id: 'order-1', userId: context.user.id }];
  });

  const result = await getOrders({ data: {} });
  expect(result).toEqual([{ id: 'order-1', userId: 'mock-user' }]);
});
```

## Common Pitfalls

- **Unregistered middleware** -- Both `mockMiddleware` and `callMiddleware` throw if the middleware hasn't been registered. The Start testing shim registers middleware at import time. Make sure the Vite plugin is active.
- **Phase selection** -- `callMiddleware` requires an explicit `phase` (`'server'` or `'client'`). If you test the wrong phase, the middleware may have no handler for it and will throw.
- **Mock scope** -- `mockMiddleware` only overrides phases you specify. If you only mock `server`, the `client` phase still runs its real implementation.
- **Cleanup** -- Call `clearStartMocks()` in `afterEach` to remove all middleware and server function mocks between tests.
- **Context is not automatically chained** -- `callMiddleware` tests a single middleware in isolation. It does not compose a middleware chain. To test the accumulated context of multiple middlewares, call them sequentially, passing each result's context as input to the next.
