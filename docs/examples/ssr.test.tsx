import { createTestRouter } from '@tanstack-router-testing/react-router-testing';
import { createRouterSsrHarness } from '@tanstack-router-testing/react-router-testing/ssr';
import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Factory that builds a fresh route tree + router per call (required for SSR)
// ---------------------------------------------------------------------------

const createAppRouter = () => {
  const root = createRootRoute({
    component: () => (
      <html>
        <body>
          <h1>SSR App</h1>
          <Outlet />
        </body>
      </html>
    ),
  });

  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <p>Home page</p>,
  });

  const about = createRoute({
    getParentRoute: () => root,
    path: '/about',
    loader: async () => ({ company: 'TanStack' }),
    component: function About() {
      const data = about.useLoaderData();
      return <p>About {data.company}</p>;
    },
  });

  const routeTree = root.addChildren([index, about]);

  return createTestRouter({ routeTree });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRouterSsrHarness — string mode', () => {
  it('renders the index route to an HTML string', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createAppRouter,
      request: 'http://localhost:3000/',
    });

    expect(harness.html).toContain('SSR App');
    expect(harness.html).toContain('Home page');
    expect(harness.mode).toBe('string');
  });

  it('renders a different route based on the request URL', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createAppRouter,
      request: 'http://localhost:3000/about',
    });

    expect(harness.html).toContain('About TanStack');
  });

  it('exposes the response and its headers', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createAppRouter,
      request: 'http://localhost:3000/',
    });

    expect(harness.response).toBeInstanceOf(Response);
    expect(harness.responseHeaders).toBeInstanceOf(Headers);
  });

  it('exposes the router instance for state inspection', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createAppRouter,
      request: 'http://localhost:3000/about',
    });

    expect(harness.router.state.location.pathname).toBe('/about');
  });
});

describe('createRouterSsrHarness — stream mode', () => {
  it('renders via streaming when mode is set to stream', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createAppRouter,
      request: 'http://localhost:3000/',
      mode: 'stream',
    });

    expect(harness.mode).toBe('stream');
    expect(harness.html).toContain('Home page');
  });
});

describe('hydration', () => {
  it('hydrates server-rendered HTML on the client', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createAppRouter,
      request: 'http://localhost:3000/',
    });

    const { router, errors, unmount } = await harness.hydrate();

    expect(router.state.location.pathname).toBe('/');
    // Hydration mismatches appear as console.error calls captured in errors
    expect(errors).toEqual([]);

    unmount();
  });

  it('hydrate accepts a custom createRouter for the client side', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createAppRouter,
      request: 'http://localhost:3000/about',
    });

    const { router, unmount } = await harness.hydrate({
      createRouter: createAppRouter,
    });

    expect(router.state.location.pathname).toBe('/about');
    unmount();
  });
});
