import type { CreateTestRouterOptions } from './createTestRouter.ts';
import type { RouterHistory } from '@tanstack/history';
import type { AnyRouter, Router } from '@tanstack/react-router';
import type { AnyRoute, AnyRouteMatch, NavigateOptions, RoutePaths, TrailingSlashOption } from '@tanstack/router-core';
import type { ComponentType, ReactElement, ReactNode } from 'react';

import { RouterProvider } from '@tanstack/react-router';

import { createTestRouter } from './createTestRouter.ts';
import { computeFullPath, neuterAncestorLoaders, walkToRoot } from './fileRouteUtils.ts';

let _QueryClientProvider: ComponentType<{ client: object; children: ReactElement }> | undefined;
const resolveQueryClientProvider = async (): Promise<void> => {
  if (_QueryClientProvider) return;
  try {
    const mod = await import('@tanstack/react-query');
    _QueryClientProvider = mod.QueryClientProvider as ComponentType<{ client: object; children: ReactElement }>;
  } catch {
    throw new Error('[tanstack-router-testing] queryClient option requires @tanstack/react-query. Install it: pnpm add -D @tanstack/react-query');
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
export type RouteMatchTarget = string | AnyRoute | { readonly id?: string; readonly routeId?: string; readonly fullPath?: string };

type HarnessNavigate<TRouter extends AnyRouter> = <
  TTo extends string | undefined,
  TFrom extends RoutePaths<TRouter['routeTree']> | string = string,
  TMaskFrom extends RoutePaths<TRouter['routeTree']> | string = TFrom,
  TMaskTo extends string = '',
>(
  options: NavigateOptions<TRouter, TFrom, TTo, TMaskFrom, TMaskTo>,
) => Promise<void>;

type HarnessRedirect<TRouter extends AnyRouter> = <
  TTo extends string | undefined,
  TFrom extends RoutePaths<TRouter['routeTree']> | string = string,
  TMaskFrom extends RoutePaths<TRouter['routeTree']> | string = TFrom,
  TMaskTo extends string = '',
>(
  options: NavigateOptions<TRouter, TFrom, TTo, TMaskFrom, TMaskTo>,
) => Promise<{ readonly pathname: string; readonly search: string; readonly hash: string } | undefined>;

/**
 * Options for {@link createRouterHarness} when testing a single file-based route.
 *
 * @typeParam TRoute - The route type, used to infer `params`, `search`, and
 *   `loaderData` types from the route's type parameters.
 *
 * @example
 * ```tsx
 * import { Route } from './routes/posts.$postId';
 *
 * const harness = createRouterHarness({
 *   route: Route,
 *   params: { postId: '42' },  // fully typed
 * });
 * ```
 */
export interface FileRouteHarnessOptions<TRoute extends AnyRoute = AnyRoute> {
  /** The file-based route to test. The full route tree is walked automatically. */
  readonly route: TRoute;
  /** Path params, fully typed from the route's path definition. */
  readonly params?: TRoute['types']['allParams'];
  /** Search params, fully typed from the route's `validateSearch`. */
  readonly search?: TRoute['types']['fullSearchSchema'];
  /** Override loader data instead of running the real loader. */
  readonly loaderData?: TRoute['types']['loaderData'];
  /** Router context passed to `beforeLoad` and `loader` functions. */
  readonly context?: Record<string, unknown>;
  /** Optional `QueryClient` for `@tanstack/react-query` integration. */
  readonly queryClient?: object;
}

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
  readonly TestRouterProvider: ComponentType<{ children?: ReactNode }>;

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
   * @remarks
   * Unlike {@link RouterHarness.getRedirect | getRedirect()}, navigation
   * errors (e.g. a `beforeLoad` guard that throws a redirect) will reject
   * the returned promise. Wrap the call in a try/catch if you expect
   * redirect-throwing guards to fire.
   *
   * @example
   * ```ts
   * await harness.navigate({ to: '/posts/$postId', params: { postId: '7' } });
   * expect(harness.getParams('/posts/$postId')).toEqual({ postId: '7' });
   * ```
   */
  readonly navigate: HarnessNavigate<TRouter>;

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
   * @remarks
   * The router must be loaded (via {@link RouterHarness.load | load()} or
   * {@link RouterHarness.navigate | navigate()}) before search params are
   * populated.
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
   * @remarks
   * The router must be loaded (via {@link RouterHarness.load | load()} or
   * {@link RouterHarness.navigate | navigate()}) before params are
   * populated.
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
   * @remarks
   * The router must be loaded (via {@link RouterHarness.load | load()})
   * before errors are captured. Errors thrown in `beforeLoad` or `loader`
   * are stored on the match rather than rejecting the `load()` promise.
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
  readonly getRedirect: HarnessRedirect<TRouter>;

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
 * Two overloads: pass `route` to test a single file-based route in
 * isolation, or pass `routeTree` for full route-tree integration tests.
 *
 * @param options - Either {@link FileRouteHarnessOptions} (with `route`) or
 *   {@link CreateTestRouterOptions} (with `routeTree`) plus an optional
 *   `queryClient`.
 * @returns A {@link RouterHarness} with the router instance, provider
 *   component, and convenience accessors for route state.
 *
 * @example
 * ```tsx
 * // File-route testing (preferred for file-based routing)
 * import { Route } from './routes/posts.$postId';
 *
 * const harness = createRouterHarness({
 *   route: Route,
 *   params: { postId: '7' },
 * });
 * await harness.load();
 * expect(harness.getLoaderData(Route)).toBeDefined();
 * harness.cleanup();
 * ```
 *
 * @example
 * ```tsx
 * // Full route tree testing
 * import { routeTree } from './routeTree.gen';
 *
 * const harness = createRouterHarness({
 *   routeTree,
 *   initialEntries: ['/posts/7'],
 * });
 * await harness.load();
 * expect(harness.getLoaderData('/posts/$postId')).toBeDefined();
 * harness.cleanup();
 * ```
 *
 * @remarks
 * The harness is render-library agnostic: use the returned
 * `TestRouterProvider` with React Testing Library, Storybook, or any other
 * React renderer. Always call {@link RouterHarness.cleanup | cleanup()} in
 * test teardown to avoid leaking history listeners.
 */
export function createRouterHarness<TRoute extends AnyRoute>(options: FileRouteHarnessOptions<TRoute>): RouterHarness<AnyRouter>;
export function createRouterHarness<
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateTestRouterOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated> & {
    readonly queryClient?: object;
  },
): RouterHarness<Router<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createRouterHarness(options: any): RouterHarness<any> {
  if (isFileRouteOptions(options)) {
    return createFileRouteHarness(options as FileRouteHarnessOptions);
  }
  return createTreeRouteHarness(options as Record<string, unknown>);
}

const createTreeRouteHarness = (options: Record<string, unknown>): RouterHarness<AnyRouter> => {
  const { queryClient, ...routerOptions } = options;
  const router = createTestRouter(routerOptions as CreateTestRouterOptions<AnyRoute>);
  return buildHarness(router, queryClient as object | undefined);
};

const createFileRouteHarness = (options: FileRouteHarnessOptions): RouterHarness<AnyRouter> => {
  const { route, params, search, loaderData, context, queryClient } = options;
  const routeTree = walkToRoot(route);
  const initialUrl = buildUrlFromRoute(route, params, search);
  const restoreAncestors = neuterAncestorLoaders(route);

  let restoreLoader: (() => void) | undefined;
  if (loaderData !== undefined) {
    const routeOpts = route.options as unknown as Record<string, unknown>;
    const originalLoader = routeOpts.loader;
    routeOpts.loader = () => loaderData;
    restoreLoader = () => {
      routeOpts.loader = originalLoader;
    };
  }

  const router = createTestRouter({
    routeTree,
    initialEntries: [initialUrl],
    ...(context !== undefined ? { context } : {}),
  } as CreateTestRouterOptions<AnyRoute>);

  const harness = buildHarness(router, queryClient, route);
  const originalCleanup = harness.cleanup;
  return {
    ...harness,
    cleanup: () => {
      originalCleanup();
      restoreAncestors();
      restoreLoader?.();
    },
  };
};

const buildHarness = (router: AnyRouter, queryClient: object | undefined, targetRoute?: AnyRoute): RouterHarness<AnyRouter> => {
  let restoreComponent: (() => void) | undefined;

  const TestRouterProvider = ({ children }: { children?: ReactNode }): ReactElement => {
    if (children !== undefined && children !== null && targetRoute !== undefined && restoreComponent === undefined) {
      const rOpts = targetRoute.options as unknown as Record<string, unknown>;
      const OriginalComponent = rOpts.component as ComponentType | undefined;
      rOpts.component = () => (
        <>
          {OriginalComponent ? <OriginalComponent /> : null}
          {children}
        </>
      );
      restoreComponent = () => {
        rOpts.component = OriginalComponent;
      };
    }
    const provider = <RouterProvider router={router} />;
    if (!queryClient || !_QueryClientProvider) return provider;
    const Provider = _QueryClientProvider;
    return <Provider client={queryClient}>{provider}</Provider>;
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
    navigate: async options => {
      await router.navigate(options);
    },
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
      if (after.pathname === intended.pathname) return;
      return { pathname: after.pathname, search: after.searchStr, hash: after.hash };
    },
    cleanup: () => {
      router.cancelMatches();
      router.history.destroy?.();
      restoreComponent?.();
    },
  };
};

const isRouteObject = (target: RouteMatchTarget): target is AnyRoute => typeof target === 'object' && 'isRoot' in target;

const getRouteId = (target: RouteMatchTarget): string => {
  if (typeof target === 'string') return target;
  if (isRouteObject(target)) return (target as AnyRoute & { id?: string }).id ?? '';
  return target.id ?? target.routeId ?? target.fullPath ?? '';
};

const buildUrlFromRoute = (route: AnyRoute, params?: Record<string, string>, search?: Record<string, unknown>): string => {
  const fullPath = computeFullPath(route);
  let url = fullPath.replaceAll(/\$([a-zA-Z_]\w*)/g, (_match, paramName: string) => {
    const value = params?.[paramName];
    if (value === undefined) throw new Error(`[tanstack-router-testing] Missing param "${paramName}" for route "${fullPath}"`);
    return encodeURIComponent(value);
  });
  if (search && Object.keys(search).length > 0) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
      qs.set(key, String(value));
    }
    url += `?${qs.toString()}`;
  }
  return url;
};

const isFileRouteOptions = (options: object): boolean =>
  'route' in options && (options as Record<string, unknown>).route !== undefined && (options as Record<string, unknown>).route !== null;
