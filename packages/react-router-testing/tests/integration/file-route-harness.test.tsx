import { Outlet, createRootRoute, createRoute, redirect } from '@tanstack/react-router';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createRouterHarness } from '../../src/index.ts';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  beforeLoad: (ctx: unknown) => {
    const { context } = ctx as { context: { auth?: { user: string } | null } };
    return { auth: context?.auth ?? null };
  },
});

const postsLayout = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  component: () => <Outlet />,
  loader: () => ({ allPosts: ['a', 'b'] }),
});

const postDetail = createRoute({
  getParentRoute: () => postsLayout,
  path: '/$postId',
  loader: ({ params }: { params: { postId: string } }) => ({
    post: { id: params.postId, title: `Post ${params.postId}` },
  }),
  component: () => {
    const data = postDetail.useLoaderData();
    return <h1>{data.post.title}</h1>;
  },
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: (input: Record<string, unknown>) => ({
    page: Number(input.page ?? 1),
  }),
  loaderDeps: ({ search }: { search: { page: number } }) => ({
    page: search.page,
  }),
  loader: ({ deps }: { deps: { page: number } }) => ({ page: deps.page }),
  component: () => {
    const data = searchRoute.useLoaderData();
    return <h1>Page {data.page}</h1>;
  },
});

const guardedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: (ctx: unknown) => {
    const { context } = ctx as { context: { auth: { user: string } | null } };
    if (!context.auth) throw redirect({ to: '/login' });
  },
  component: () => <div>Admin</div>,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <h1>Login</h1>,
});

const errorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fail',
  loader: () => {
    throw new Error('boom');
  },
  errorComponent: () => <div>Error caught</div>,
});

describe('createRouterHarness with route option', () => {
  beforeAll(() => {
    rootRoute.addChildren([
      postsLayout.addChildren([postDetail]),
      searchRoute,
      guardedRoute,
      loginRoute,
      errorRoute,
    ]);
  });

  afterEach(cleanup);

  it('loads a single route with typed params', async () => {
    const h = createRouterHarness({
      route: postDetail,
      params: { postId: '42' },
    });
    await h.load();
    expect(h.getLoaderData(postDetail)).toStrictEqual({
      post: { id: '42', title: 'Post 42' },
    });
    h.cleanup();
  });

  it('neuters ancestor loaders', async () => {
    const h = createRouterHarness({
      route: postDetail,
      params: { postId: '7' },
    });
    await h.load();
    expect(h.getLoaderData(postsLayout)).toBeUndefined();
    expect(h.getLoaderData(postDetail)).toBeDefined();
    h.cleanup();
  });

  it('runs ancestor beforeLoad for context cascading', async () => {
    const h = createRouterHarness({
      route: guardedRoute,
      context: { auth: { user: 'alice' } },
    });
    await h.load();
    expect(h.getRouteContext(guardedRoute)).toMatchObject({
      auth: { user: 'alice' },
    });
    h.cleanup();
  });

  it('catches throw redirect() in beforeLoad', async () => {
    const h = createRouterHarness({
      route: guardedRoute,
      context: { auth: null },
    });
    const result = await h.getRedirect({ to: '/admin' });
    expect(result?.pathname).toBe('/login');
    h.cleanup();
  });

  it('renders the route component with Route.useLoaderData()', async () => {
    const { TestRouterProvider } = createRouterHarness({
      route: postDetail,
      params: { postId: '42' },
    });
    const { findByText } = render(<TestRouterProvider />);
    await expect(findByText('Post 42')).resolves.toBeTruthy();
  });

  it('accepts search params', async () => {
    const h = createRouterHarness({
      route: searchRoute,
      search: { page: 3 },
    });
    await h.load();
    expect(h.getSearch(searchRoute)).toStrictEqual({ page: 3 });
    expect(h.getLoaderData(searchRoute)).toStrictEqual({ page: 3 });
    h.cleanup();
  });

  it('overrides loader data when loaderData is provided', async () => {
    const stubData = { post: { id: '99', title: 'Stubbed' } };
    const h = createRouterHarness({
      route: postDetail,
      params: { postId: '99' },
      loaderData: stubData,
    });
    await h.load();
    expect(h.getLoaderData(postDetail)).toStrictEqual(stubData);
    h.cleanup();
  });

  it('renders errorComponent when loader throws', async () => {
    const { TestRouterProvider } = createRouterHarness({
      route: errorRoute,
    });
    const { findByText } = render(<TestRouterProvider />);
    await expect(findByText('Error caught')).resolves.toBeTruthy();
  });

  it('getError returns the thrown error', async () => {
    const h = createRouterHarness({ route: errorRoute });
    await h.load();
    expect(h.getError(errorRoute)).toBeInstanceOf(Error);
    h.cleanup();
  });

  it('renders children inside TestRouterProvider for independent components', async () => {
    const PostTitle = () => {
      const data = postDetail.useLoaderData();
      return <span data-testid="title">{data.post.title}</span>;
    };

    const { TestRouterProvider } = createRouterHarness({
      route: postDetail,
      params: { postId: '42' },
    });
    const { findByTestId } = render(
      <TestRouterProvider>
        <PostTitle />
      </TestRouterProvider>,
    );
    await expect(findByTestId('title')).resolves.toBeTruthy();
  });
});
