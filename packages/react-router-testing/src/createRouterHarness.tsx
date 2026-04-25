import type { CreateTestRouterOptions } from './createTestRouter.ts';
import type { RouterHistory } from '@tanstack/history';
import type { AnyRouter, Router } from '@tanstack/react-router';
import type { AnyRoute, AnyRouteMatch, TrailingSlashOption } from '@tanstack/router-core';
import type { ComponentType, ReactElement } from 'react';

import { RouterProvider } from '@tanstack/react-router';

import { createTestRouter } from './createTestRouter.ts';

let _QueryClientProvider: ComponentType<{ client: object; children: ReactElement }> | undefined;
const resolveQueryClientProvider = async (): Promise<void> => {
  if (_QueryClientProvider) return;
  try {
    const mod = await import('@tanstack/react-query');
    _QueryClientProvider = mod.QueryClientProvider as ComponentType<{ client: object; children: ReactElement }>;
  } catch {
    throw new Error(
      '[tanstack-router-testing] queryClient option requires @tanstack/react-query. ' +
        'Install it: pnpm add -D @tanstack/react-query',
    );
  }
};

/**
 * Identifies a route match inside the current router state.
 *
 * Pass a plain string to match against any of `id`, `routeId`, or `fullPath`.
 * Pass an object to match against a specific field.
 *
 * @remarks
 * When an object is given, fields are checked in precedence order:
 * `id` > `routeId` > `fullPath`. The first defined field wins. A bare
 * string is compared against all three, returning the first match.
 *
 * @example
 * ```ts
 * // by string — matches id, routeId, or fullPath
 * harness.getLoaderData('/posts/$postId');
 *
 * // by object — match on routeId only
 * harness.getLoaderData({ routeId: '/posts/$postId' });
 * ```
 */
export type RouteMatchTarget = string | { readonly id?: string; readonly routeId?: string; readonly fullPath?: string };

/**
 * Facade returned by {@link createRouterHarness} for testing routes, loaders,
 * guards, redirects, and component rendering against a real TanStack Router
 * instance.
 *
 * @typeParam TRouter - The concrete router type, preserving full route-tree
 *   type inference for `navigate`, `preloadRoute`, and all state accessors.
 *
 * @example
 * ```tsx
 * const harness = createRouterHarness({
 *   routeTree,
 *   initialEntries: ['/posts/7'],
 * });
 * await harness.load();
 *
 * const { getByText } = render(<harness.TestRouterProvider />);
 * expect(harness.getLoaderData('/posts/$postId')).toEqual({ id: 7, title: 'Hello' });
 * ```
 */
export interface RouterHarness<TRouter extends AnyRouter> {
  /**
   * The underlying router instance created by {@link createTestRouter}.
   *
   * @remarks
   * Useful for low-level assertions on `router.state` or for passing the
   * router to utilities that expect a raw `Router` object.
   */
  readonly router: TRouter;

  /**
   * A React component that wraps {@link RouterProvider} (and optionally
   * `QueryClientProvider`) around the test router.
   *
   * @remarks
   * Pass this to your rendering library's `render()` or `mount()` function.
   * If a `queryClient` was supplied to {@link createRouterHarness}, it is
   * automatically wrapped with `QueryClientProvider` from
   * `@tanstack/react-query`.
   *
   * @example
   * ```tsx
   * const { TestRouterProvider } = createRouterHarness({ routeTree });
   * const { getByText } = render(<TestRouterProvider />);
   * ```
   */
  readonly TestRouterProvider: ComponentType;

  /**
   * Load the router, resolving all matched route loaders and `beforeLoad`
   * guards for the current location.
   *
   * @returns A promise that resolves once `router.load()` completes.
   *
   * @remarks
   * Must be called before querying state with accessors like
   * {@link RouterHarness.getLoaderData | getLoaderData} or
   * {@link RouterHarness.getRouteContext | getRouteContext}, otherwise
   * those will return `undefined`. If a `queryClient` was provided to
   * {@link createRouterHarness}, `load()` lazily imports
   * `@tanstack/react-query` on the first call and throws with an install
   * hint if the package is missing.
   *
   * @example
   * ```ts
   * const harness = createRouterHarness({ routeTree, initialEntries: ['/'] });
   * await harness.load();
   * ```
   */
  readonly load: () => Promise<void>;

  /**
   * Navigate the router to a new location and wait for the transition to
   * settle.
   *
   * @param options - The same navigation options accepted by
   *   `router.navigate()` (e.g. `{ to: '/posts/$postId', params: { postId: '7' } }`).
   * @returns A promise that resolves when navigation completes.
   *
   * @example
   * ```ts
   * await harness.navigate({ to: '/posts/$postId', params: { postId: '7' } });
   * expect(harness.getParams('/posts/$postId')).toEqual({ postId: '7' });
   * ```
   */
  readonly navigate: (options: Parameters<TRouter['navigate']>[0]) => Promise<void>;

  /**
   * Preload a route's code-split chunks and loaders without navigating.
   *
   * @param options - The same preload options accepted by
   *   `router.preloadRoute()`.
   * @returns The preloaded route matches, or `undefined` if preloading was
   *   skipped.
   *
   * @remarks
   * Useful for verifying that lazy route modules resolve correctly or that
   * preload-triggered loaders populate the cache.
   *
   * @example
   * ```ts
   * const matches = await harness.preload({ to: '/settings' });
   * expect(matches).toBeDefined();
   * ```
   */
  readonly preload: (options: Parameters<TRouter['preloadRoute']>[0]) => Promise<readonly AnyRouteMatch[] | undefined>;

  /**
   * Match a URL against the route tree without mutating router state.
   *
   * @param href - An absolute path (e.g. `'/posts/7?page=2'`). Relative
   *   paths are also accepted since they are resolved against an internal
   *   base URL.
   * @returns An array of matched routes, ordered from root to leaf.
   *
   * @remarks
   * This performs route-tree matching only. It does **not** trigger
   * navigation, loaders, or `beforeLoad` guards, and it does not update
   * `router.state`.
   *
   * @example
   * ```ts
   * const matches = harness.match('/posts/7');
   * expect(matches.some(m => m.routeId === '/posts/$postId')).toBe(true);
   * ```
   */
  readonly match: (href: string) => readonly AnyRouteMatch[];

  /**
   * Find a single route match in `router.state.matches` by id, routeId, or
   * fullPath.
   *
   * @param target - A {@link RouteMatchTarget} identifying the desired match.
   * @returns The matching {@link AnyRouteMatch}, or `undefined` if no match
   *   is found.
   *
   * @remarks
   * The router must be loaded (via {@link RouterHarness.load | load()} or
   * {@link RouterHarness.navigate | navigate()}) before matches are
   * available.
   *
   * @example
   * ```ts
   * await harness.load();
   * const match = harness.getMatch('/posts/$postId');
   * expect(match?.status).toBe('success');
   * ```
   */
  readonly getMatch: (target: RouteMatchTarget) => AnyRouteMatch | undefined;

  /**
   * Retrieve the loader data for a matched route.
   *
   * @param target - A {@link RouteMatchTarget} identifying the route.
   * @returns The `loaderData` from the matched route, or `undefined` if the
   *   match is not found.
   *
   * @remarks
   * Returns `undefined` both when the target is unmatched and when the
   * loader has not yet run. Always call {@link RouterHarness.load | load()}
   * first.
   *
   * @example
   * ```ts
   * await harness.load();
   * expect(harness.getLoaderData('/posts/$postId')).toEqual({ id: 7, title: 'Hello' });
   * ```
   */
  readonly getLoaderData: (target: RouteMatchTarget) => unknown;

  /**
   * Retrieve the route context for a matched route.
   *
   * @param target - A {@link RouteMatchTarget} identifying the route.
   * @returns The `context` object from the matched route, or `undefined` if
   *   the match is not found.
   *
   * @remarks
   * Context is populated by `beforeLoad` and parent route contexts. If the
   * router has not been loaded, this returns `undefined`.
   *
   * @example
   * ```ts
   * await harness.load();
   * expect(harness.getRouteContext('/__root__')).toEqual({ auth: stubAuth });
   * ```
   */
  readonly getRouteContext: (target: RouteMatchTarget) => unknown;

  /**
   * Retrieve the validated search params for a matched route.
   *
   * @param target - A {@link RouteMatchTarget} identifying the route.
   * @returns The `search` object from the matched route, or `undefined` if
   *   the match is not found.
   *
   * @example
   * ```ts
   * const harness = createRouterHarness({
   *   routeTree,
   *   initialEntries: ['/search?page=3'],
   * });
   * await harness.load();
   * expect(harness.getSearch('/search')).toEqual({ page: 3 });
   * ```
   */
  readonly getSearch: (target: RouteMatchTarget) => unknown;

  /**
   * Retrieve the parsed route params for a matched route.
   *
   * @param target - A {@link RouteMatchTarget} identifying the route.
   * @returns The `params` object from the matched route, or `undefined` if
   *   the match is not found.
   *
   * @example
   * ```ts
   * await harness.load();
   * expect(harness.getParams('/posts/$postId')).toEqual({ postId: '7' });
   * ```
   */
  readonly getParams: (target: RouteMatchTarget) => unknown;

  /**
   * Retrieve the error thrown during loading of a matched route.
   *
   * @param target - A {@link RouteMatchTarget} identifying the route.
   * @returns The `error` value from the matched route, or `undefined` if no
   *   error occurred or the match is not found.
   *
   * @example
   * ```ts
   * await harness.load();
   * expect(harness.getError('/fail')).toBeInstanceOf(Error);
   * ```
   */
  readonly getError: (target: RouteMatchTarget) => unknown;

  /**
   * Navigate to a location and detect whether a redirect occurred.
   *
   * @param options - The same navigation options accepted by
   *   `router.navigate()`.
   * @returns An object with `pathname`, `search`, and `hash` of the final
   *   location if a redirect happened, or `undefined` if the router landed
   *   at the intended destination.
   *
   * @remarks
   * This compares the intended destination (via `router.buildLocation`) to
   * the actual location after navigation + load. Navigation errors are
   * silently swallowed so that redirect-throwing `beforeLoad` guards don't
   * cause the promise to reject.
   *
   * @example
   * ```ts
   * const redirect = await harness.getRedirect({ to: '/admin' });
   * expect(redirect).toEqual({
   *   pathname: '/login',
   *   search: '',
   *   hash: '',
   * });
   * ```
   */
  readonly getRedirect: (options: Parameters<TRouter['navigate']>[0]) => Promise<
    { readonly pathname: string; readonly search: string; readonly hash: string } | undefined
  >;

  /**
   * Tear down the router, cancelling pending matches and destroying the
   * history instance.
   *
   * @remarks
   * Call this in your test teardown (e.g. `afterEach`). Once called, the
   * router is no longer usable and calling other harness methods will produce
   * undefined behavior.
   *
   * @example
   * ```ts
   * afterEach(() => {
   *   harness.cleanup();
   * });
   * ```
   */
  readonly cleanup: () => void;
}

/**
 * Create a {@link RouterHarness} containing a fully wired test router and a
 * React provider component.
 *
 * Combines {@link createTestRouter} with a `RouterProvider` wrapper (and an
 * optional `QueryClientProvider`), giving tests a single entry point for
 * rendering, navigating, and asserting against route state.
 *
 * @typeParam TRouteTree - The application's route tree type (typically from
 *   `routeTree.gen.ts`).
 * @typeParam TTrailingSlash - Trailing-slash behavior.
 * @typeParam TDefaultStructural - Whether structural sharing is the default.
 * @typeParam TDehydrated - Dehydrated state shape for SSR.
 *
 * @param options - All options from {@link CreateTestRouterOptions} plus an
 *   optional `queryClient` for `@tanstack/react-query` integration.
 * @param options.queryClient - An optional `QueryClient` instance. When
 *   provided, the harness wraps the router provider with
 *   `QueryClientProvider` from `@tanstack/react-query`. The package is
 *   lazily imported on the first {@link RouterHarness.load | load()} call
 *   and throws with an install hint if missing.
 * @returns A {@link RouterHarness} with the router instance, provider
 *   component, and convenience accessors for route state.
 *
 * @example
 * ```tsx
 * import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
 * import { render } from '@testing-library/react';
 * import { routeTree } from './routeTree.gen';
 *
 * const harness = createRouterHarness({
 *   routeTree,
 *   initialEntries: ['/posts/7'],
 *   context: { auth: stubAuth },
 * });
 * await harness.load();
 *
 * const { getByText } = render(<harness.TestRouterProvider />);
 * expect(getByText('Post #7')).toBeDefined();
 * expect(harness.getLoaderData('/posts/$postId')).toEqual({ id: 7 });
 *
 * harness.cleanup();
 * ```
 *
 * @remarks
 * The harness is render-library agnostic: use the returned
 * `TestRouterProvider` with React Testing Library, Storybook, or any other
 * React renderer. Always call {@link RouterHarness.cleanup | cleanup()} in
 * test teardown to avoid leaking history listeners.
 */
export const createRouterHarness = <
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateTestRouterOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated> & {
    readonly queryClient?: object;
  },
): RouterHarness<Router<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated>> => {
  const { queryClient, ...routerOptions } = options;
  const router = createTestRouter(routerOptions as CreateTestRouterOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated>);

  const TestRouterProvider = (): ReactElement => {
    const provider = <RouterProvider router={router} />;
    if (!queryClient || !_QueryClientProvider) return provider;
    const QCP = _QueryClientProvider;
    return <QCP client={queryClient}>{provider}</QCP>;
  };

  const findMatch = (target: RouteMatchTarget): AnyRouteMatch | undefined => {
    const routeId = getRouteId(target);
    const matches = router.state.matches as readonly AnyRouteMatch[];
    return matches.find(match => match.routeId === routeId || match.id === routeId || match.fullPath === routeId);
  };

  return {
    router,
    TestRouterProvider,
    load: async () => {
      if (queryClient) await resolveQueryClientProvider();
      await router.load();
    },
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
