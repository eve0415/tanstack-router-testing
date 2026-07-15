/**
 * Integration tests for per-route `overrides` on the full-tree harness.
 *
 * Overrides are applied by structurally cloning the tree, so the source tree
 * is never mutated — these tests assert both that overrides take effect and
 * that the original routes keep their real behavior afterwards.
 */

import { Outlet, createRootRoute, createRoute, redirect } from '@tanstack/react-router';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createRouterHarness } from '../../src/index.ts';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$postId',
  loader: ({ params }: { params: { postId: string } }) => ({ post: { id: params.postId, title: `real ${params.postId}` } }),
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: (ctx: unknown) => {
    const { context } = ctx as { context: { auth: { user: string } | null } };
    if (!context.auth) throw redirect({ to: '/login' });
    return { admin: context.auth.user };
  },
  component: () => <div>admin</div>,
});

const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: () => <h1>login</h1> });

// Pathless auth layout (no path, explicit id) guarding a child — the common `_authed` shape.
const authLayout = createRoute({
  id: '_auth',
  getParentRoute: () => rootRoute,
  beforeLoad: (ctx: unknown) => {
    const { context } = ctx as { context: { auth: { user: string } | null } };
    if (!context.auth) throw redirect({ to: '/login' });
    return { user: context.auth.user };
  },
  component: () => <Outlet />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/dashboard',
  loader: () => ({ widgets: 3 }),
});

const routeTree = rootRoute.addChildren([postRoute, adminRoute, loginRoute, authLayout.addChildren([dashboardRoute])]);

describe('createRouterHarness overrides (structural cloning)', () => {
  afterEach(() => {
    cleanup();
  });

  it('overrides a route loader by id', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/posts/7'],
      overrides: { '/posts/$postId': { loader: () => ({ post: { id: '7', title: 'MOCK' } }) } },
    });
    await harness.load();
    expect(harness.getLoaderData('/posts/$postId')).toStrictEqual({ post: { id: '7', title: 'MOCK' } });
    harness.cleanup();
  });

  it('overrides beforeLoad by id to inject context and bypass a guard redirect', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/admin'],
      context: { auth: null },
      overrides: { '/admin': { beforeLoad: () => ({ admin: 'override-user' }) } },
    });
    await harness.load();
    expect(harness.getRedirect).toBeDefined();
    expect(harness.getRouteContext('/admin')).toMatchObject({ admin: 'override-user' });
    harness.cleanup();
  });

  it('clones pathless layout routes and overrides their beforeLoad by id', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/dashboard'],
      context: { auth: null }, // would redirect to /login without the override
      overrides: { '/_auth': { beforeLoad: () => ({ user: 'override-user' }) } },
    });
    await harness.load();
    expect(harness.getRouteContext('/_auth')).toMatchObject({ user: 'override-user' });
    expect(harness.getLoaderData('/_auth/dashboard')).toStrictEqual({ widgets: 3 });
    harness.cleanup();
  });

  it('leaves the source tree unmutated (leak-proof isolation)', async () => {
    const baseline = createRouterHarness({ routeTree, initialEntries: ['/posts/7'] });
    await baseline.load();
    const realData = baseline.getLoaderData('/posts/$postId');
    baseline.cleanup();
    expect(realData).toStrictEqual({ post: { id: '7', title: 'real 7' } });

    const overridden = createRouterHarness({
      routeTree,
      initialEntries: ['/posts/7'],
      overrides: { '/posts/$postId': { loader: () => ({ post: { id: '7', title: 'MOCK' } }) } },
    });
    await overridden.load();
    overridden.cleanup();

    const after = createRouterHarness({ routeTree, initialEntries: ['/posts/7'] });
    await after.load();
    expect(after.getLoaderData('/posts/$postId')).toStrictEqual(realData);
    after.cleanup();
  });
});
