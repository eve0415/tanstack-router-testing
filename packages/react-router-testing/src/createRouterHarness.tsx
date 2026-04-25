import type { CreateTestRouterOptions } from './createTestRouter.ts';
import type { RouterHistory } from '@tanstack/history';
import type { AnyRouter, Router } from '@tanstack/react-router';
import type { AnyRoute, AnyRouteMatch, TrailingSlashOption } from '@tanstack/router-core';
import type { ComponentType, ReactElement } from 'react';

import { RouterProvider } from '@tanstack/react-router';

import { createTestRouter } from './createTestRouter.ts';

export type RouteMatchTarget = string | { readonly id?: string; readonly routeId?: string; readonly fullPath?: string };

export interface RouterHarness<TRouter extends AnyRouter> {
  readonly router: TRouter;
  readonly TestRouterProvider: ComponentType;
  readonly load: () => Promise<void>;
  readonly navigate: (options: Parameters<TRouter['navigate']>[0]) => Promise<void>;
  readonly preload: (options: Parameters<TRouter['preloadRoute']>[0]) => Promise<readonly AnyRouteMatch[] | undefined>;
  readonly match: (href: string) => readonly AnyRouteMatch[];
  readonly getMatch: (target: RouteMatchTarget) => AnyRouteMatch | undefined;
  readonly getLoaderData: (target: RouteMatchTarget) => unknown;
  readonly getRouteContext: (target: RouteMatchTarget) => unknown;
  readonly getSearch: (target: RouteMatchTarget) => unknown;
  readonly getParams: (target: RouteMatchTarget) => unknown;
  readonly getError: (target: RouteMatchTarget) => unknown;
  readonly getRedirect: (options: Parameters<TRouter['navigate']>[0]) => Promise<
    { readonly pathname: string; readonly search: string; readonly hash: string } | undefined
  >;
  readonly cleanup: () => void;
}

/**
 * Create a test router and a provider component for component tests.
 *
 * This stays render-library agnostic: use the returned provider with React
 * Testing Library, Storybook, or any other React renderer.
 */
export const createRouterHarness = <
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateTestRouterOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated>,
): RouterHarness<Router<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated>> => {
  const router = createTestRouter(options);

  const TestRouterProvider = (): ReactElement => <RouterProvider router={router} />;

  const findMatch = (target: RouteMatchTarget): AnyRouteMatch | undefined => {
    const routeId = getRouteId(target);
    const matches = router.state.matches as readonly AnyRouteMatch[];
    return matches.find(match => match.routeId === routeId || match.id === routeId || match.fullPath === routeId);
  };

  return {
    router,
    TestRouterProvider,
    load: () => router.load(),
    navigate: options => router.navigate(options).then(() => undefined),
    preload: options => router.preloadRoute(options) as Promise<readonly AnyRouteMatch[] | undefined>,
    match: href => {
      const url = new URL(href, 'http://tanstack-router-testing.test');
      return router.matchRoutes(url.pathname, router.options.parseSearch(url.search)) as readonly AnyRouteMatch[];
    },
    getMatch: findMatch,
    getLoaderData: target => findMatch(target)?.loaderData,
    getRouteContext: target => findMatch(target)?.context,
    getSearch: target => findMatch(target)?.search,
    getParams: target => findMatch(target)?.params,
    getError: target => findMatch(target)?.error,
    getRedirect: async options => {
      const intended = router.buildLocation(options as Parameters<typeof router.buildLocation>[0]);
      await router.navigate(options).catch(() => {});
      await router.load();
      const after = router.state.location;
      if (after.pathname === intended.pathname) return undefined;
      return { pathname: after.pathname, search: after.searchStr, hash: after.hash };
    },
    cleanup: () => {
      router.cancelMatches();
      router.history.destroy?.();
    },
  };
};

const getRouteId = (target: RouteMatchTarget): string => {
  if (typeof target === 'string') return target;
  return target.id ?? target.routeId ?? target.fullPath ?? '';
};
