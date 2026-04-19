import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, expect, it } from 'vitest';

import { createRouterHarness, createTestRouter } from '../../../src/index.ts';

interface RouteLike {
  readonly id?: string;
  readonly fullPath?: string;
  readonly path?: string;
  readonly parentRoute?: RouteLike;
  readonly children?: readonly RouteLike[];
}

interface RouterLike {
  readonly routesById: Record<string, RouteLike>;
  readonly state: {
    readonly location: {
      readonly pathname: string;
    };
    readonly matches: readonly unknown[];
  };
  matchRoutes: (pathname: string) => readonly { routeId: string }[];
}

const ROOT_ROUTE_ID = '__root__';
const UNSAFE_STATIC_PATH_CHARS = /[$*{}]/;

const routeLabel = (route: RouteLike): string => route.id ?? route.fullPath ?? route.path ?? '<anonymous>';

const isStaticPath = (path: string): boolean => path.startsWith('/') && !UNSAFE_STATIC_PATH_CHARS.test(path);

const getStaticPaths = (routesById: Record<string, RouteLike>): string[] => {
  const paths = new Set<string>(['/']);

  for (const route of Object.values(routesById)) {
    if (route.fullPath !== undefined && isStaticPath(route.fullPath)) {
      paths.add(route.fullPath);
    }
  }

  return [...paths].sort((a, b) => a.localeCompare(b));
};

const getRouter = (routeTree: RouteLike): RouterLike =>
  createTestRouter({
    routeTree: routeTree as never,
    initialEntries: ['/'],
  }) as unknown as RouterLike;

export const assertVendoredRouteTreeHarness = (routeTree: RouteLike): void => {
  afterEach(() => {
    cleanup();
  });

  it('builds a complete route id registry', () => {
    const router = getRouter(routeTree);
    const routeIds = Object.keys(router.routesById);

    expect(routeIds).toContain(ROOT_ROUTE_ID);
    expect(routeIds.length).toBeGreaterThan(1);
    expect(new Set(routeIds).size).toBe(routeIds.length);

    for (const routeId of routeIds) {
      const route = router.routesById[routeId];
      expect(route, `missing route object for ${routeId}`).toBeDefined();
      expect(route?.id, `route id mismatch for ${routeId}`).toBe(routeId);
    }
  });

  it('keeps every child route attached to a registered parent', () => {
    const router = getRouter(routeTree);

    for (const [routeId, route] of Object.entries(router.routesById)) {
      if (routeId === ROOT_ROUTE_ID) continue;
      const parentId = route.parentRoute?.id;
      expect(parentId, `missing parent for ${routeLabel(route)}`).toBeDefined();
      expect(router.routesById[parentId ?? ''], `unregistered parent ${parentId ?? '<none>'} for ${routeId}`).toBeDefined();
    }
  });

  it('matches the initial URL before rendering', () => {
    const router = getRouter(routeTree);
    const matches = router.matchRoutes('/');

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.routeId).toBe(ROOT_ROUTE_ID);
  });

  it('matches all static route paths without executing route handlers', () => {
    const router = getRouter(routeTree);
    const staticPaths = getStaticPaths(router.routesById);

    expect(staticPaths).toContain('/');

    for (const path of staticPaths) {
      const matches = router.matchRoutes(path);
      expect(matches.length, `expected ${path} to match at least the root route`).toBeGreaterThan(0);
      expect(matches[0]?.routeId, `expected ${path} to start at the root route`).toBe(ROOT_ROUTE_ID);
    }
  });

  it('mounts the router and exposes active state', () => {
    const { router, TestRouterProvider } = createRouterHarness({
      routeTree: routeTree as never,
      initialEntries: ['/'],
    });
    render(createElement(TestRouterProvider));

    expect(router.state.location.pathname).toBe('/');
    expect(Array.isArray(router.state.matches)).toBe(true);
  });
};
