import { createRouterHarness, createTestRouter } from '@tanstack-router-testing/react-router-testing';
import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Route tree (normally generated — hand-built here for illustration)
// ---------------------------------------------------------------------------

const rootRoute = createRootRoute({
  component: () => (
    <div>
      <h1>App</h1>
      <Outlet />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <p>Welcome home</p>,
});

const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  component: () => <Outlet />,
});

const postRoute = createRoute({
  getParentRoute: () => postsRoute,
  path: '/$postId',
  loader: async ({ params }) => {
    return { id: Number(params.postId), title: `Post #${params.postId}` };
  },
  component: function PostComponent() {
    const { id, title } = postRoute.useLoaderData();
    return (
      <article>
        <h2>{title}</h2>
        <span data-testid='post-id'>{id}</span>
      </article>
    );
  },
});

const routeTree = rootRoute.addChildren([indexRoute, postsRoute.addChildren([postRoute])]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createTestRouter', () => {
  it('creates a router with memory history defaulting to /', () => {
    const router = createTestRouter({ routeTree });

    expect(router.state.location.pathname).toBe('/');
  });

  it('accepts initialEntries to start at a specific path', () => {
    const router = createTestRouter({
      routeTree,
      initialEntries: ['/posts/42'],
    });

    expect(router.state.location.pathname).toBe('/posts/42');
  });
});

describe('createRouterHarness', () => {
  let harness: ReturnType<typeof createRouterHarness<typeof routeTree>>;

  afterEach(() => {
    harness.cleanup();
  });

  it('loads the index route and renders it', async () => {
    harness = createRouterHarness({ routeTree });
    await harness.load();

    render(<harness.TestRouterProvider />);
    expect(screen.getByText('Welcome home')).toBeDefined();
  });

  it('provides loader data for a matched route', async () => {
    harness = createRouterHarness({
      routeTree,
      initialEntries: ['/posts/7'],
    });
    await harness.load();

    const data = harness.getLoaderData('/posts/$postId') as {
      id: number;
      title: string;
    };
    expect(data).toEqual({ id: 7, title: 'Post #7' });
  });

  it('exposes parsed route params', async () => {
    harness = createRouterHarness({
      routeTree,
      initialEntries: ['/posts/99'],
    });
    await harness.load();

    expect(harness.getParams('/posts/$postId')).toEqual({ postId: '99' });
  });

  it('navigates to a new route and updates state', async () => {
    harness = createRouterHarness({ routeTree });
    await harness.load();

    await harness.navigate({
      to: '/posts/$postId',
      params: { postId: '3' },
    });

    const data = harness.getLoaderData('/posts/$postId') as {
      id: number;
      title: string;
    };
    expect(data).toEqual({ id: 3, title: 'Post #3' });
  });

  it('renders navigated route components', async () => {
    harness = createRouterHarness({ routeTree });
    await harness.load();

    const { unmount } = render(<harness.TestRouterProvider />);

    await harness.navigate({
      to: '/posts/$postId',
      params: { postId: '5' },
    });

    await waitFor(() => {
      expect(screen.getByText('Post #5')).toBeDefined();
    });

    unmount();
  });

  it('matches a URL without navigating', () => {
    harness = createRouterHarness({ routeTree });
    const matches = harness.match('/posts/42');

    expect(matches.some(m => m.routeId === '/posts/$postId')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// File-route harness (testing a single route in isolation)
// ---------------------------------------------------------------------------

describe('createRouterHarness with route option', () => {
  it('loads a single route with typed params', async () => {
    const harness = createRouterHarness({
      route: postRoute,
      params: { postId: '42' },
    });
    await harness.load();

    expect(harness.getLoaderData(postRoute)).toEqual({
      id: 42,
      title: 'Post #42',
    });
    harness.cleanup();
  });

  it('overrides loader data', async () => {
    const harness = createRouterHarness({
      route: postRoute,
      params: { postId: '1' },
      loaderData: { id: 99, title: 'Stubbed' },
    });
    await harness.load();

    expect(harness.getLoaderData(postRoute)).toEqual({
      id: 99,
      title: 'Stubbed',
    });
    harness.cleanup();
  });

  it('renders the route component with Route.useLoaderData()', async () => {
    const { TestRouterProvider } = createRouterHarness({
      route: postRoute,
      params: { postId: '5' },
    });
    render(<TestRouterProvider />);

    await waitFor(() => {
      expect(screen.getByText('Post #5')).toBeDefined();
    });
  });

  it('renders children that use route hooks', async () => {
    const PostId = () => {
      const { id } = postRoute.useLoaderData();
      return <span data-testid='id'>{id}</span>;
    };

    const { TestRouterProvider } = createRouterHarness({
      route: postRoute,
      params: { postId: '7' },
    });
    render(
      <TestRouterProvider>
        <PostId />
      </TestRouterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('id').textContent).toBe('7');
    });
  });
});
