/**
 * Integration tests for the upstream-shaped router testing surface.
 * Loaders and guards are exercised through real router navigation.
 *
 * The routeTree is constructed inline so the test owns its full graph
 * without depending on a vendored app's transitive imports. The vendored
 * apps are still exercised indirectly: this test uses the exact same
 * createFileRoute / createRootRoute API the vendored apps use.
 */

import { createMemoryHistory } from '@tanstack/history';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Outlet, createRootRoute, createRoute, redirect } from '@tanstack/react-router';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createRouterHarness, createTestRouter } from '../../src/index.ts';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <h1>Home</h1>,
});

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$postId',
  loader: ({ params }: { params: { postId: string } }) => ({
    post: { id: params.postId, title: `Post ${params.postId}` },
  }),
  component: () => {
    const data = postRoute.useLoaderData();
    return <h1>{data.post.title}</h1>;
  },
});

const guardedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: (ctx: unknown) => {
    const { context } = ctx as { context: { auth: { user: string } | null } };
    if (!context.auth) throw redirect({ to: '/login' });
    return { admin: context.auth.user };
  },
  component: () => <div>admin-page</div>,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <h1>Login</h1>,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: (input: Record<string, unknown>) => ({
    page: Number(input.page ?? 1),
  }),
  loaderDeps: ({ search }: { search: { page: number } }) => ({ page: search.page }),
  loader: ({ deps }: { deps: { page: number } }) => ({ page: deps.page }),
  component: () => {
    const data = searchRoute.useLoaderData();
    return <h1>Search {data.page}</h1>;
  },
});

const routeTree = rootRoute.addChildren([indexRoute, postRoute, guardedRoute, loginRoute, searchRoute]);

describe('react-router-testing harness integration', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the initial route from initialEntries', async () => {
    const { TestRouterProvider } = createRouterHarness({
      routeTree,
      initialEntries: ['/'],
    });
    const { findByText } = render(<TestRouterProvider />);
    await expect(findByText('Home')).resolves.toBeTruthy();
  });

  it('returns the router instance so navigation works from the test body', async () => {
    const { router, TestRouterProvider } = createRouterHarness({
      routeTree,
      initialEntries: ['/'],
    });
    const { findByText } = render(<TestRouterProvider />);
    await findByText('Home');
    await router.navigate({ to: '/posts/$postId', params: { postId: '42' } });
    await findByText('Post 42');
    expect(router.state.location.pathname).toBe('/posts/42');
  });

  it('runs route loaders through the router', async () => {
    const { TestRouterProvider } = createRouterHarness({
      routeTree,
      initialEntries: ['/posts/7'],
    });
    const { findByText } = render(<TestRouterProvider />);
    await expect(findByText('Post 7')).resolves.toBeTruthy();
  });

  it('runs beforeLoad guards through the router', async () => {
    const { router, TestRouterProvider } = createRouterHarness({
      routeTree,
      initialEntries: ['/admin'],
      context: { auth: null },
    });
    const { findByText } = render(<TestRouterProvider />);
    await expect(findByText('Login')).resolves.toBeTruthy();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('defaults pending minimums to zero for fast tests', () => {
    const router = createTestRouter({ routeTree });
    expect(router.options.defaultPendingMinMs).toBe(0);
  });

  it('rejects mixed custom history and memory history options', () => {
    expect(() =>
      createTestRouter({
        routeTree,
        history: createMemoryHistory(),
        initialEntries: ['/'],
      } as never),
    ).toThrow(/either history or initialEntries/);
  });

  it('allows callers to provide their own history', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const { router, TestRouterProvider } = createRouterHarness({
      routeTree,
      history,
    });
    const { findByText } = render(<TestRouterProvider />);
    await findByText('Home');
    expect(router.history).toBe(history);
  });

  it('getError returns the error thrown by a loader', async () => {
    const error = new Error('loader failed');
    const root = createRootRoute();
    const failRoute = createRoute({
      getParentRoute: () => root,
      path: '/fail',
      loader: () => {
        throw error;
      },
      errorComponent: () => <div>Error</div>,
    });
    const tree = root.addChildren([failRoute]);
    const harness = createRouterHarness({
      routeTree: tree,
      initialEntries: ['/fail'],
    });
    await harness.load();
    expect(harness.getError('/fail')).toBe(error);
    harness.cleanup();
  });

  it('getRedirect returns the resolved location after a redirect', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/'],
      context: { auth: null },
    });
    await harness.load();
    const result = await harness.getRedirect({ to: '/admin' });
    expect(result).toBeDefined();
    expect(result!.pathname).toBe('/login');
    harness.cleanup();
  });

  it('getRedirect returns undefined when no redirect occurs', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/'],
    });
    await harness.load();
    const result = await harness.getRedirect({ to: '/posts/$postId', params: { postId: '1' } });
    expect(result).toBeUndefined();
    harness.cleanup();
  });

  it('exposes route lifecycle state through harness accessors', async () => {
    const harness = createRouterHarness({
      routeTree,
      initialEntries: ['/search?page=3'],
    });

    await harness.load();

    expect(harness.getSearch(searchRoute)).toStrictEqual({ page: 3 });
    expect(harness.getLoaderData(searchRoute)).toStrictEqual({ page: 3 });
    expect(harness.match('/posts/123').some(match => match.routeId === '/posts/$postId')).toBeTruthy();

    await harness.navigate({ to: '/posts/$postId', params: { postId: '99' } });

    expect(harness.getParams(postRoute)).toEqual({ postId: '99' });
    expect(harness.getLoaderData('/posts/$postId')).toStrictEqual({ post: { id: '99', title: 'Post 99' } });
  });

  it('wraps in QueryClientProvider when queryClient is provided', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const root = createRootRoute({
      component: () => {
        const qc = useQueryClient();
        return <div data-testid="has-query">{qc ? 'yes' : 'no'}</div>;
      },
    });
    const tree = root.addChildren([]);
    const harness = createRouterHarness({ routeTree: tree, queryClient });
    await harness.load();
    const { getByTestId } = render(<harness.TestRouterProvider />);
    expect(getByTestId('has-query').textContent).toBe('yes');
    harness.cleanup();
    queryClient.clear();
  });
});
