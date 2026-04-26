# Testing beforeLoad, Redirects, and Auth Guards

## Problem

`beforeLoad` guards run before loaders and can redirect, throw errors, or enrich context. You need to test these behaviors without rendering a full app or relying on browser navigation.

## Setup

```ts
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { createRootRoute, createRoute, redirect } from '@tanstack/react-router';
import { describe, it, expect, afterEach } from 'vitest';
```

## Testing Redirects with `getRedirect()`

`getRedirect()` navigates to a URL and returns the final location if a redirect occurred, or `undefined` if it didn't.

```ts
const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => 'Login Page',
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: () => {
    throw redirect({ to: '/login' });
  },
});

const routeTree = rootRoute.addChildren([loginRoute, adminRoute]);

describe('admin guard', () => {
  let harness: ReturnType<typeof createRouterHarness>;

  afterEach(() => harness.cleanup());

  it('redirects unauthenticated users to /login', async () => {
    harness = createRouterHarness({ routeTree, initialEntries: ['/'] });
    await harness.load();

    const result = await harness.getRedirect({ to: '/admin' });
    expect(result).toEqual({
      pathname: '/login',
      search: '',
      hash: '',
    });
  });
});
```

## Testing Errors with `getError()`

When a `beforeLoad` guard throws a non-redirect error, it is captured on the route match. Use `getError()` to inspect it.

```ts
const brokenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/broken',
  beforeLoad: () => {
    throw new Error('Route is under maintenance');
  },
});

const routeTree = rootRoute.addChildren([brokenRoute]);

it('captures errors thrown in beforeLoad', async () => {
  harness = createRouterHarness({
    routeTree,
    initialEntries: ['/broken'],
  });
  await harness.load();

  const error = harness.getError('/broken');
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe('Route is under maintenance');
});
```

## Auth Context Pattern

A common pattern passes auth state through the root route's context. Guards on child routes read that context to decide whether to redirect.

```ts
interface AuthContext {
  auth: { userId: string } | null;
}

const rootRoute = createRootRoute({
  // Context is supplied externally via createRouterHarness options
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: ({ context }) => {
    const { auth } = context as AuthContext;
    if (!auth) {
      throw redirect({ to: '/login' });
    }
  },
  loader: () => ({ stats: { users: 100 } }),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => 'Login',
});

const routeTree = rootRoute.addChildren([dashboardRoute, loginRoute]);

describe('auth guard with context', () => {
  let harness: ReturnType<typeof createRouterHarness>;

  afterEach(() => harness.cleanup());

  it('redirects when auth is null', async () => {
    harness = createRouterHarness({
      routeTree,
      initialEntries: ['/'],
      context: { auth: null },
    });
    await harness.load();

    const result = await harness.getRedirect({ to: '/dashboard' });
    expect(result?.pathname).toBe('/login');
  });

  it('allows access when auth is present', async () => {
    harness = createRouterHarness({
      routeTree,
      initialEntries: ['/dashboard'],
      context: { auth: { userId: 'u1' } },
    });
    await harness.load();

    const result = harness.getLoaderData('/dashboard');
    expect(result).toEqual({ stats: { users: 100 } });
  });
});
```

## File-Based Route Testing with Guards

When testing file-based routes with auth guards, ancestor `beforeLoad` functions run normally (preserved for context cascading). Only ancestor loaders are neutered.

```ts
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { Route as AdminRoute } from './routes/admin';

it('redirects unauthenticated users', async () => {
  const harness = createRouterHarness({
    route: AdminRoute,
    context: { auth: null },
  });
  const result = await harness.getRedirect({ to: '/admin' });
  expect(result?.pathname).toBe('/login');
  harness.cleanup();
});

it('allows access when authenticated', async () => {
  const harness = createRouterHarness({
    route: AdminRoute,
    context: { auth: { user: 'alice' } },
  });
  await harness.load();
  expect(harness.getRouteContext(AdminRoute)).toMatchObject({
    auth: { user: 'alice' },
  });
  harness.cleanup();
});
```

## Inspecting Route Context After Guards

`beforeLoad` can enrich the context for downstream routes. Use `getRouteContext()` to verify.

```ts
const enrichedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/enriched',
  beforeLoad: () => {
    return { permissions: ['read', 'write'] };
  },
  loader: () => ({}),
});

const routeTree = rootRoute.addChildren([enrichedRoute]);

it('merges context from beforeLoad', async () => {
  harness = createRouterHarness({
    routeTree,
    initialEntries: ['/enriched'],
  });
  await harness.load();

  const ctx = harness.getRouteContext('/enriched') as Record<string, unknown>;
  expect(ctx.permissions).toEqual(['read', 'write']);
});
```

## Common Pitfalls

- **Using `navigate()` for redirect tests** -- `navigate()` rejects on redirect errors. Use `getRedirect()` instead, which silently follows the redirect and reports the final location.
- **Forgetting to supply context** -- If your guard reads `context.auth`, you must pass `context: { auth: ... }` to `createRouterHarness`. Otherwise the guard sees `undefined`.
- **Mixing up error sources** -- `getError()` returns the error stored on a specific route match. If the error occurs in a parent route's `beforeLoad`, check the parent's match target, not the child's.
- **Redirect vs. error** -- `redirect()` from `@tanstack/react-router` creates a special redirect object. Regular `throw new Error(...)` is captured as a match error, not a redirect.
