import { createRootRoute, createRoute, redirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';

// ---------------------------------------------------------------------------
// Route tree with guards, redirects, and error scenarios
// ---------------------------------------------------------------------------

let isAuthenticated = false;

const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <p>Login page</p>,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => <p>Dashboard</p>,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: () => {
    if (!isAuthenticated) {
      throw redirect({ to: '/login', search: { returnTo: '/admin' } });
    }
  },
  component: () => <p>Admin panel</p>,
});

const failRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fail',
  loader: async () => {
    throw new Error('Data source unavailable');
  },
  component: () => <p>This never renders</p>,
});

const contextRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/with-context',
  beforeLoad: () => {
    return { featureFlags: { beta: true } };
  },
  loader: async () => ({ loaded: true }),
  component: () => <p>Context route</p>,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  adminRoute,
  failRoute,
  contextRoute,
]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('redirect detection with getRedirect', () => {
  it('detects a redirect when the user is not authenticated', async () => {
    isAuthenticated = false;

    const harness = createRouterHarness({ routeTree });
    await harness.load();

    const result = await harness.getRedirect({ to: '/dashboard' });

    expect(result).toEqual({
      pathname: '/login',
      search: '',
      hash: '',
    });

    harness.cleanup();
  });

  it('returns undefined when no redirect occurs', async () => {
    isAuthenticated = true;

    const harness = createRouterHarness({ routeTree });
    await harness.load();

    const result = await harness.getRedirect({ to: '/dashboard' });

    expect(result).toBeUndefined();

    harness.cleanup();
  });

  it('captures redirect search params as a string', async () => {
    isAuthenticated = false;

    const harness = createRouterHarness({ routeTree });
    await harness.load();

    const result = await harness.getRedirect({ to: '/admin' });

    expect(result).toBeDefined();
    expect(result?.pathname).toBe('/login');
    // search is a raw query string, not a parsed object
    expect(result?.search).toContain('returnTo');

    harness.cleanup();
  });
});

describe('beforeLoad guards — context injection', () => {
  it('injects context from beforeLoad into the route match', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/with-context'],
    });
    await harness.load();

    const context = harness.getRouteContext('/with-context') as {
      featureFlags: { beta: boolean };
    };
    expect(context).toHaveProperty('featureFlags.beta', true);

    harness.cleanup();
  });
});

describe('loader errors with getError', () => {
  it('captures loader errors on the match', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/fail'],
    });
    await harness.load();

    const error = harness.getError('/fail');

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Data source unavailable');

    harness.cleanup();
  });

  it('returns undefined when no error occurred', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/with-context'],
    });
    await harness.load();

    expect(harness.getError('/with-context')).toBeUndefined();

    harness.cleanup();
  });
});

describe('getMatch — low-level match inspection', () => {
  it('finds a match by routeId', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/with-context'],
    });
    await harness.load();

    const match = harness.getMatch('/with-context');
    expect(match).toBeDefined();
    expect(match?.status).toBe('success');

    harness.cleanup();
  });

  it('returns undefined for an unmatched route', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/login'],
    });
    await harness.load();

    expect(harness.getMatch('/dashboard')).toBeUndefined();

    harness.cleanup();
  });
});
