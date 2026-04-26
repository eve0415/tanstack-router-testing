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

## Testing File-Based Routes

If your app uses file-based routing, you can test a single route file directly — no need to build a route tree by hand. Import the route, pass it to `createRouterHarness`, and get fully typed `params` and `search`.

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { Route } from './routes/posts.$postId';

describe('post route', () => {
  it('loads and renders a post', async () => {
    const harness = createRouterHarness({
      route: Route,
      params: { postId: '42' }, // typed from the route's path
    });
    await harness.load();

    expect(harness.getLoaderData(Route)).toBeDefined();

    const { findByText } = render(<harness.TestRouterProvider />);
    await expect(findByText('Post 42')).resolves.toBeTruthy();
    harness.cleanup();
  });
});
```

The harness automatically:

- Walks from the route to its root to get the full route tree
- Neuters ancestor loaders for isolation (ancestor `beforeLoad` still runs for context cascading)
- Computes the initial URL from `params` and `search`

You can also override loader data to skip the real loader entirely:

```tsx
const harness = createRouterHarness({
  route: Route,
  params: { postId: '42' },
  loaderData: { id: '42', title: 'Stubbed Post' },
});
```

Or test independent components that call `Route.useLoaderData()`:

```tsx
const { TestRouterProvider } = createRouterHarness({
  route: Route,
  params: { postId: '42' },
});
render(
  <TestRouterProvider>
    <MyComponent /> {/* calls Route.useLoaderData() internally */}
  </TestRouterProvider>,
);
```

> **Note:** The Vite plugin (`tanstackStartTesting()`) auto-injects `routeTree.gen.ts` as a Vitest setup file, so all routes have their parent/path/id wired up before any test runs. If you're not using the plugin, import `routeTree.gen.ts` at the top of your test file for side effects.

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
