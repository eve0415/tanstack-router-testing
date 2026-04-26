# Testing Route Loaders and Data Fetching

## Problem

Route loaders run inside TanStack Router's lifecycle. You need to verify that loaders return the right data for given params, search params, and async conditions -- without spinning up a full app.

## Setup

```ts
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { createRootRoute, createRoute, createRouteMask } from '@tanstack/react-router';
import { describe, it, expect, afterEach } from 'vitest';
```

## Basic Loader

Define a route with a synchronous loader, create a harness, load, and assert.

```ts
const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: () => ({ message: 'hello' }),
});

const routeTree = rootRoute.addChildren([indexRoute]);

describe('index loader', () => {
  let harness: ReturnType<typeof createRouterHarness>;

  afterEach(() => harness.cleanup());

  it('returns the expected data', async () => {
    harness = createRouterHarness({ routeTree, initialEntries: ['/'] });
    await harness.load();

    expect(harness.getLoaderData('/')).toEqual({ message: 'hello' });
  });
});
```

## Async Loader

Loaders that return promises are resolved before `load()` settles.

```ts
const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  loader: async () => {
    // Simulates an API call
    return { posts: [{ id: 1, title: 'First' }] };
  },
});

const routeTree = rootRoute.addChildren([postsRoute]);

it('resolves async loader data', async () => {
  harness = createRouterHarness({ routeTree, initialEntries: ['/posts'] });
  await harness.load();

  expect(harness.getLoaderData('/posts')).toEqual({
    posts: [{ id: 1, title: 'First' }],
  });
});
```

## Loader with Route Params

Access params through the loader's context argument. Use `initialEntries` to set the URL.

```ts
const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$postId',
  loader: async ({ params }) => {
    return { id: params.postId, title: `Post ${params.postId}` };
  },
});

const routeTree = rootRoute.addChildren([postRoute]);

it('receives parsed params', async () => {
  harness = createRouterHarness({
    routeTree,
    initialEntries: ['/posts/42'],
  });
  await harness.load();

  expect(harness.getLoaderData('/posts/$postId')).toEqual({
    id: '42',
    title: 'Post 42',
  });
  expect(harness.getParams('/posts/$postId')).toEqual({ postId: '42' });
});
```

## Loader with Search Params

Validate search params with `validateSearch`, then use them in the loader.

```ts
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: z.object({ page: z.number().default(1) }),
  loader: async ({ search }) => {
    return { results: [], page: search.page };
  },
});

const routeTree = rootRoute.addChildren([searchRoute]);

it('uses validated search params', async () => {
  harness = createRouterHarness({
    routeTree,
    initialEntries: ['/search?page=3'],
  });
  await harness.load();

  expect(harness.getLoaderData('/search')).toEqual({ results: [], page: 3 });
  expect(harness.getSearch('/search')).toEqual({ page: 3 });
});
```

## File-Based Route Testing

When using file-based routing, import the route directly and pass it to the harness. Ancestor loaders are automatically neutered for isolation.

```ts
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { Route } from './routes/posts.$postId';

it('loads a file-based route with typed params', async () => {
  const harness = createRouterHarness({
    route: Route,
    params: { postId: '42' }, // fully typed
  });
  await harness.load();

  expect(harness.getLoaderData(Route)).toBeDefined();
  harness.cleanup();
});
```

Override loader data to skip the real loader (useful when loaders make HTTP calls):

```ts
it('uses stubbed loader data', async () => {
  const harness = createRouterHarness({
    route: Route,
    params: { postId: '42' },
    loaderData: { id: '42', title: 'Stubbed' },
  });
  await harness.load();

  expect(harness.getLoaderData(Route)).toEqual({ id: '42', title: 'Stubbed' });
  harness.cleanup();
});
```

Search params work the same way:

```ts
import { Route as SearchRoute } from './routes/search';

it('passes typed search params', async () => {
  const harness = createRouterHarness({
    route: SearchRoute,
    search: { page: 3 }, // typed from validateSearch
  });
  await harness.load();

  expect(harness.getSearch(SearchRoute)).toEqual({ page: 3 });
  harness.cleanup();
});
```

## Common Pitfalls

- **Forgetting `await harness.load()`** -- `getLoaderData()` returns `undefined` until the router finishes loading. Always await `load()` before asserting.
- **Wrong match target** -- `getLoaderData()` accepts a route id, routeId, or fullPath string. If your route is `/posts/$postId`, pass that exact string, not `/posts/42`.
- **Missing cleanup** -- Call `harness.cleanup()` in `afterEach` to destroy the history listener and prevent leaks across tests.
- **Navigate vs. load** -- `harness.load()` loads the current location. To test a different URL after creation, use `harness.navigate({ to: '/other' })` which navigates and waits for the transition to settle.
