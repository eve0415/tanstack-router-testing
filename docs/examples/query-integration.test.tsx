import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Route tree with react-query integration
// ---------------------------------------------------------------------------

const fetchUser = vi.fn().mockResolvedValue({ id: 'u1', name: 'Alice' });
const fetchPosts = vi.fn().mockResolvedValue([
  { id: 1, title: 'First post' },
  { id: 2, title: 'Second post' },
]);

const rootRoute = createRootRoute({
  component: () => (
    <div>
      <Outlet />
    </div>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: function Profile() {
    // useQuery reads from the QueryClientProvider that the harness sets up
    const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });

    if (!data) return <p>Loading user...</p>;
    return <p>User: {data.name}</p>;
  },
});

const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  component: function Posts() {
    const { data } = useQuery({ queryKey: ['posts'], queryFn: fetchPosts });

    if (!data) return <p>Loading posts...</p>;
    return (
      <ul>
        {data.map((post: { id: number; title: string }) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    );
  },
});

const routeTree = rootRoute.addChildren([profileRoute, postsRoute]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QueryClient integration with createRouterHarness', () => {
  let queryClient: QueryClient;
  let harness: ReturnType<typeof createRouterHarness<typeof routeTree>>;

  afterEach(() => {
    harness.cleanup();
    queryClient.clear();
  });

  it('wraps the router provider with QueryClientProvider', async () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    harness = createRouterHarness({
      routeTree,
      queryClient,
      initialEntries: ['/profile'],
    });
    await harness.load();

    render(<harness.TestRouterProvider />);

    await waitFor(() => {
      expect(screen.getByText('User: Alice')).toBeDefined();
    });

    expect(fetchUser).toHaveBeenCalledOnce();
  });

  it('makes the QueryClient accessible to all routes', async () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    harness = createRouterHarness({
      routeTree,
      queryClient,
      initialEntries: ['/posts'],
    });
    await harness.load();

    render(<harness.TestRouterProvider />);

    await waitFor(() => {
      expect(screen.getByText('First post')).toBeDefined();
      expect(screen.getByText('Second post')).toBeDefined();
    });
  });

  it('allows prefilling the QueryClient cache before rendering', async () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Seed the cache before the harness renders
    queryClient.setQueryData(['user'], { id: 'u-prefilled', name: 'Bob' });

    harness = createRouterHarness({
      routeTree,
      queryClient,
      initialEntries: ['/profile'],
    });
    await harness.load();

    render(<harness.TestRouterProvider />);

    // The prefilled data is available immediately
    expect(screen.getByText('User: Bob')).toBeDefined();
    // The fetch function should not have been called since cache was primed
    expect(fetchUser).not.toHaveBeenCalled();
  });

  it('navigates between routes that use different queries', async () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    harness = createRouterHarness({
      routeTree,
      queryClient,
      initialEntries: ['/profile'],
    });
    await harness.load();

    const { unmount } = render(<harness.TestRouterProvider />);

    await waitFor(() => {
      expect(screen.getByText('User: Alice')).toBeDefined();
    });

    await harness.navigate({ to: '/posts' });

    await waitFor(() => {
      expect(screen.getByText('First post')).toBeDefined();
    });

    unmount();
  });
});
