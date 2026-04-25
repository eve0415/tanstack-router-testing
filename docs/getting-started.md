# Getting Started

## Installation

```sh
pnpm add -D @tanstack-router-testing/react-router-testing @tanstack-router-testing/react-start-testing
```

You also need the usual peer dependencies: `@tanstack/react-router`, `react`, `react-dom`, `vitest`, and `@testing-library/react`.

## Configure Vitest

If your app uses TanStack Start, add the `tanstackStartTesting()` Vite plugin. It wires up route-tree generation and aliases `@tanstack/react-start` to an in-process test shim so server functions run directly without a network layer.

```ts
// vitest.config.ts
import { tanstackStartTesting } from '@tanstack-router-testing/react-start-testing/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tanstackStartTesting()],
  test: {
    environment: 'jsdom',
  },
});
```

If you only use TanStack Router (no Start), skip the plugin — no special Vitest config is needed.

## Write Your First Test

Create a route tree, spin up a harness, load routes, navigate, and assert on loader data — all against a real router instance with memory history.

```tsx
import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: () => ({ message: 'Hello from index' }),
  component: () => <h1>Home</h1>,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  loader: () => ({ title: 'About Us' }),
  component: () => <h1>About</h1>,
});

const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

describe('router harness', () => {
  it('loads the index route and reads loader data', async () => {
    const harness = createRouterHarness({ routeTree });
    await harness.load();

    expect(harness.getLoaderData('/')).toEqual({ message: 'Hello from index' });

    const { getByText } = render(<harness.TestRouterProvider />);
    expect(getByText('Home')).toBeDefined();

    harness.cleanup();
  });

  it('navigates to /about and asserts on the new route', async () => {
    const harness = createRouterHarness({ routeTree });
    await harness.load();

    await harness.navigate({ to: '/about' });

    expect(harness.getLoaderData('/about')).toEqual({ title: 'About Us' });
    expect(harness.getParams('/about')).toEqual({});

    harness.cleanup();
  });
});
```

## Common Patterns

Clean up the harness in `afterEach` so history listeners don't leak between tests:

```tsx
import { afterEach, describe, expect, it } from 'vitest';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';

describe('my routes', () => {
  let harness: ReturnType<typeof createRouterHarness>;

  afterEach(() => {
    harness.cleanup();
  });

  it('loads the root', async () => {
    harness = createRouterHarness({ routeTree });
    await harness.load();
    expect(harness.getMatch('/')).toBeDefined();
  });
});
```

## Testing with TanStack Start

When testing server functions, use `mockServerFn` to replace the real handler and `clearStartMocks` to tear down all mocks between tests:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { clearStartMocks, mockServerFn } from '@tanstack-router-testing/react-start-testing';
import { getUser } from '../server/getUser';

describe('getUser server function', () => {
  afterEach(() => {
    clearStartMocks();
  });

  it('returns mocked user data', async () => {
    mockServerFn(getUser, async ({ data }) => ({
      id: data.userId,
      name: 'Test User',
    }));

    const result = await getUser({ data: { userId: '42' } });
    expect(result).toEqual({ id: '42', name: 'Test User' });
  });
});
```

`mockServerFn` returns a disposer if you prefer per-test teardown instead of `clearStartMocks`:

```ts
const dispose = mockServerFn(getUser, async () => ({ id: '1', name: 'Mock' }));
// ... test ...
dispose();
```

The Start package also exports `mockMiddleware` for overriding middleware phases, and `runInStartEnv` for controlling the server/client environment flag. See the [`react-start-testing` package](../packages/react-start-testing) for the full API.

## Next Steps

- Browse the [`docs/guides/`](./guides/) and [`docs/examples/`](./examples/) directories as they're populated.
- Read the JSDoc on each export — every public function and type has `@param`, `@returns`, and `@example` annotations.
- Check the package READMEs: [`react-router-testing`](../packages/react-router-testing), [`react-start-testing`](../packages/react-start-testing).
