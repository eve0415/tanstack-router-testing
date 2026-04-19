import { createRootRoute, createRoute } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { createTestRouter } from '../../src/index.ts';
import { createRouterSsrHarness } from '../../src/ssr.tsx';

const rootRoute = createRootRoute({
  component: () => <main>SSR root</main>,
});

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
  }),
]);

describe('router ssr harness', () => {
  it('renders through TanStack Router SSR request handling', async () => {
    const harness = await createRouterSsrHarness({
      request: 'http://tanstack-router-testing.test/',
      createRouter: () => createTestRouter({ routeTree }),
    });

    expect(harness.response.status).toBe(200);
    expect(harness.html).toContain('SSR root');
    expect(harness.router.state.location.pathname).toBe('/');
  });
});
