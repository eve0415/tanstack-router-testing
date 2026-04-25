# Mocking Server Functions with mockServerFn

## Problem

TanStack Start server functions (`createServerFn`) execute on the server. In unit tests, you need to replace the real handler with a controlled mock so you can test components and loaders that call server functions without a running server.

## Setup

```ts
import { mockServerFn, clearStartMocks } from '@tanstack-router-testing/react-start-testing';
import { createServerFn } from '@tanstack/react-start';
import { describe, it, expect, afterEach } from 'vitest';
```

## Basic mockServerFn Pattern

`mockServerFn(fn, impl)` replaces the server function's handler and returns a disposer to restore the original.

```ts
// -- server function definition (e.g., in server/orders.ts) --
const listOrders = createServerFn()
  .validator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    // In production, this hits the database
    return db.orders.findMany({ where: { userId: data.userId } });
  });

// -- test --
describe('listOrders', () => {
  afterEach(() => {
    clearStartMocks();
  });

  it('returns mocked orders', async () => {
    const dispose = mockServerFn(listOrders, async ({ data }) => [
      { id: '1', userId: data.userId, total: 42 },
      { id: '2', userId: data.userId, total: 99 },
    ]);

    const result = await listOrders({ data: { userId: 'u1' } });

    expect(result).toEqual([
      { id: '1', userId: 'u1', total: 42 },
      { id: '2', userId: 'u1', total: 99 },
    ]);

    dispose();
  });
});
```

## Disposer Cleanup vs. clearStartMocks

You have two cleanup strategies:

**Per-mock disposer** -- fine-grained, useful when only one or two mocks are active:

```ts
const dispose = mockServerFn(getUser, async () => ({ id: 'u1', name: 'Test' }));
// ... test ...
dispose(); // restores only this mock
```

**clearStartMocks() in afterEach** -- resets all server function and middleware mocks at once. Recommended for most test suites:

```ts
afterEach(() => {
  clearStartMocks();
});
```

Both approaches are safe to combine. `clearStartMocks()` removes all mocks regardless of whether individual disposers have been called.

## Testing a Component That Calls a Server Function

Mock the server function before rendering the component.

```ts
import { render, screen, waitFor } from '@testing-library/react';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';

// Assume OrderList component calls listOrders internally
import { OrderList } from './OrderList';
import { listOrders } from './server/orders';

describe('OrderList component', () => {
  afterEach(() => {
    clearStartMocks();
  });

  it('displays orders from the server function', async () => {
    mockServerFn(listOrders, async () => [
      { id: '1', userId: 'u1', total: 42 },
    ]);

    // If the component lives inside a route, use the harness
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/orders'],
    });
    await harness.load();

    render(<harness.TestRouterProvider />);

    await waitFor(() => {
      expect(screen.getByText('$42')).toBeDefined();
    });

    harness.cleanup();
  });
});
```

## Mocking Server Functions That Throw

Test error paths by having the mock throw.

```ts
it('handles server function errors', async () => {
  mockServerFn(listOrders, async () => {
    throw new Error('Database connection failed');
  });

  await expect(listOrders({ data: { userId: 'u1' } })).rejects.toThrow(
    'Database connection failed',
  );
});
```

## Common Pitfalls

- **Unregistered server function** -- `mockServerFn` throws if the function hasn't been registered. Registration happens automatically when the Start testing shim/plugin is active. Make sure your Vitest config includes the plugin from `@tanstack-router-testing/react-start-testing/vite`.
- **Mock signature matches callable shape** -- The mock receives the same arguments as the public callable (e.g., `{ data }` for validated functions). Internal context fields are normalized automatically.
- **Forgetting cleanup** -- Mocks persist across tests within the same module. Always call `clearStartMocks()` in `afterEach` or use the disposer.
- **Async mocks must return promises** -- If the real handler is async, the mock should be async too (or return a Promise) to maintain the same contract.
