# TanStack Query Integration

## Problem

Many TanStack Router apps use TanStack Query for data fetching. Route loaders call `queryClient.ensureQueryData()`, and components use `useQuery()`. Tests need a real `QueryClient` wired into the router harness so that query caching, invalidation, and component rendering all work correctly.

## Setup

Install `@tanstack/react-query` as a dev dependency (it's an optional peer dependency of `@tanstack-router-testing/react-router-testing`).

```ts
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { QueryClient } from '@tanstack/react-query';
import { createRootRoute, createRoute } from '@tanstack/react-router';
import { describe, it, expect, afterEach } from 'vitest';
```

## Passing QueryClient to the Harness

Pass a `queryClient` option to `createRouterHarness`. The harness wraps `RouterProvider` with `QueryClientProvider` automatically.

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries in tests
      gcTime: 0, // Don't cache between tests
    },
  },
});

const rootRoute = createRootRoute();

const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  loader: async ({ context }) => {
    const qc = context.queryClient as QueryClient;
    return qc.ensureQueryData({
      queryKey: ['posts'],
      queryFn: async () => [
        { id: 1, title: 'First Post' },
        { id: 2, title: 'Second Post' },
      ],
    });
  },
});

const routeTree = rootRoute.addChildren([postsRoute]);

describe('route with TanStack Query', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('populates the query cache via the loader', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/posts'],
      context: { queryClient },
      queryClient,
    });

    await harness.load();

    // Loader data is available through the harness
    const data = harness.getLoaderData('/posts');
    expect(data).toEqual([
      { id: 1, title: 'First Post' },
      { id: 2, title: 'Second Post' },
    ]);

    // Query cache is also populated
    const cached = queryClient.getQueryData(['posts']);
    expect(cached).toEqual(data);

    harness.cleanup();
  });
});
```

## Rendering Components That Use useQuery

When a component uses `useQuery`, the `QueryClientProvider` from the harness ensures the hook works correctly.

```tsx
import { render, screen, waitFor } from '@testing-library/react';

// PostList.tsx
// function PostList() {
//   const { data } = useQuery({ queryKey: ['posts'], queryFn: fetchPosts });
//   return <ul>{data?.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
// }

describe('PostList component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('renders posts from the query cache', async () => {
    // Pre-populate the cache so the component renders immediately
    queryClient.setQueryData(['posts'], [{ id: 1, title: 'Cached Post' }]);

    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/posts'],
      context: { queryClient },
      queryClient,
    });
    await harness.load();

    render(<harness.TestRouterProvider />);

    await waitFor(() => {
      expect(screen.getByText('Cached Post')).toBeDefined();
    });

    harness.cleanup();
  });
});
```

## File-Based Route Testing with QueryClient

The `route` option works with `queryClient` the same way:

```tsx
import { QueryClient } from '@tanstack/react-query';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { Route as PostsRoute } from './routes/posts';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

const harness = createRouterHarness({
  route: PostsRoute,
  context: { queryClient },
  queryClient,
});
await harness.load();
```

## Isolated QueryClient Per Test

Create a fresh `QueryClient` in `beforeEach` to prevent cache leakage between tests.

```ts
describe('isolated query tests', () => {
  let queryClient: QueryClient;
  let harness: ReturnType<typeof createRouterHarness>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
    harness.cleanup();
  });

  it('test A does not leak into test B', async () => {
    harness = createRouterHarness({
      routeTree,
      initialEntries: ['/posts'],
      context: { queryClient },
      queryClient,
    });
    await harness.load();

    expect(queryClient.getQueryData(['posts'])).toBeDefined();
  });

  it('starts with an empty cache', () => {
    expect(queryClient.getQueryData(['posts'])).toBeUndefined();
  });
});
```

## Testing Query Invalidation

Navigate, invalidate a query, and verify the loader re-fetches.

```ts
it('re-fetches after invalidation', async () => {
  let callCount = 0;

  const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/posts',
    loader: async ({ context }) => {
      callCount++;
      const qc = context.queryClient as QueryClient;
      return qc.fetchQuery({
        queryKey: ['posts'],
        queryFn: async () => [{ id: callCount, title: `Call ${callCount}` }],
      });
    },
  });

  const routeTree = rootRoute.addChildren([postsRoute]);
  const harness = createRouterHarness({
    routeTree,
    initialEntries: ['/posts'],
    context: { queryClient },
    queryClient,
  });

  await harness.load();
  expect(harness.getLoaderData('/posts')).toEqual([{ id: 1, title: 'Call 1' }]);

  // Invalidate and reload
  await queryClient.invalidateQueries({ queryKey: ['posts'] });

  harness.cleanup();
});
```

## Common Pitfalls

- **Missing `queryClient` in both places** -- Pass `queryClient` to both the harness options (for `QueryClientProvider` wrapping) and `context` (for loaders that read `context.queryClient`). They serve different purposes.
- **Stale cache between tests** -- Always call `queryClient.clear()` in `afterEach`. Without it, cached data from one test leaks into the next.
- **Retry storms in tests** -- Set `retry: false` in the QueryClient's default options. Otherwise, failed queries retry 3 times with exponential backoff, making tests slow and flaky.
- **Missing @tanstack/react-query** -- The `queryClient` option requires `@tanstack/react-query` as a peer dependency. The harness lazily imports it on the first `load()` call and throws with an install hint if the package is missing.
- **gcTime: 0 for test isolation** -- Setting `gcTime: 0` prevents the garbage collector from holding onto stale entries. This makes cache assertions deterministic.
