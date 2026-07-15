import type { AnyRoute } from '@tanstack/router-core';

import { createRootRouteWithContext, createRoute } from '@tanstack/react-router';

/**
 * A per-route option override applied by {@link cloneRouteTree}.
 *
 * Each field replaces the corresponding option on the cloned route. Fields
 * left out keep the route's real behavior — so real loaders and guards still
 * run everywhere except the routes you name.
 *
 * @remarks
 * The functions are intentionally loosely typed: an override rarely needs the
 * real per-route context type, and matching it would require threading the
 * route's generics through the override map. Write `loader: async () => data`
 * or annotate the context parameter yourself when you need it.
 */
export interface RouteOverride {
  /** Replace the route's `loader`, skipping the real one. */
  readonly loader?: (...args: never[]) => unknown;
  /** Replace the route's `beforeLoad` guard (e.g. to inject auth context). */
  readonly beforeLoad?: (...args: never[]) => unknown;
  /** Replace the route's `context` contribution. */
  readonly context?: Record<string, unknown> | ((...args: never[]) => unknown);
  /** Replace the route's `validateSearch`. */
  readonly validateSearch?: (input: Record<string, unknown>) => unknown;
  /** Replace the route's `loaderDeps`. */
  readonly loaderDeps?: (opts: { readonly search: Record<string, unknown> }) => unknown;
}

/**
 * Per-route overrides keyed by route id.
 *
 * Ids match the router's own ids — `'__root__'` for the root, and the
 * file-route id for everything else (e.g. `'/_authed'`, `'/posts/$postId'`).
 *
 * @example
 * ```ts
 * const overrides: RouteOverrides = {
 *   '/_authed': { beforeLoad: () => ({ user: stubUser }) },
 *   '/posts/$postId': { loader: async () => ({ id: 7, title: 'Mock' }) },
 * };
 * ```
 */
export type RouteOverrides = Readonly<Record<string, RouteOverride>>;

/**
 * A structurally-cloned route tree.
 */
export interface ClonedRouteTree {
  /** The cloned root route, ready to hand to `createRouter`/`createTestRouter`. */
  readonly root: AnyRoute;
  /** Cloned routes indexed by their original route id. */
  readonly byId: ReadonlyMap<string, AnyRoute>;
}

type RouteOpts = Record<string, unknown>;

// Route options are effectively an untyped bag at the reconstruction boundary;
// mirror the cast used across fileRouteUtils rather than thread route generics.
const routeOpts = (route: AnyRoute): RouteOpts => route.options as unknown as RouteOpts;
const childrenOf = (route: AnyRoute): readonly AnyRoute[] | undefined => route.children as readonly AnyRoute[] | undefined;
const makeRoute = (options: RouteOpts): AnyRoute => createRoute(options as unknown as Parameters<typeof createRoute>[0]);
const makeRootRoute = (options: RouteOpts): AnyRoute =>
  createRootRouteWithContext()(options as unknown as Parameters<ReturnType<typeof createRootRouteWithContext>>[0]);

const getOverrideFor = (overrides: RouteOverrides | undefined, routeId: string): RouteOverride => overrides?.[routeId] ?? {};

/**
 * Populate every route's derived properties (`children`, `id`, `fullPath`) by
 * calling `init` down the tree. TanStack derives these lazily, so a freshly
 * imported tree may not expose them until initialized.
 */
const initSourceTree = (route: AnyRoute, counter: { i: number }): void => {
  route.init({ originalIndex: counter.i });
  counter.i += 1;
  const children = childrenOf(route);
  if (children !== undefined && children.length > 0) {
    for (const child of children) initSourceTree(child, counter);
  }
};

const cloneChild = (oldRoute: AnyRoute, parent: AnyRoute, overrides: RouteOverrides | undefined, byId: Map<string, AnyRoute>): AnyRoute => {
  // Strip the parent link (re-wired below) and, for routes that have a path,
  // the id — a path route re-derives its id from path + cloned parent, and
  // reusing the original id would collide. Pathless (layout) routes have no
  // path to derive from, so their explicit id must be preserved or they
  // collapse to `__root__`.
  const { id: originalId, getParentRoute: _getParentRoute, ...rest } = routeOpts(oldRoute);
  const isPathless = rest.path === undefined || rest.path === '';
  // `createRoute` (never `createFileRoute`): file routes register in TanStack's
  // global file-route registry by path, so re-cloning would collide.
  const cloned = makeRoute({
    ...rest,
    ...(isPathless ? { id: originalId } : {}),
    ...getOverrideFor(overrides, oldRoute.id),
    getParentRoute: () => parent,
  });
  byId.set(oldRoute.id, cloned);

  const children = childrenOf(oldRoute);
  if (children !== undefined && children.length > 0) {
    cloned.addChildren(children.map(child => cloneChild(child, cloned, overrides, byId)));
  }
  return cloned;
};

/**
 * Deep-clone a TanStack Router tree, applying per-route option overrides keyed
 * by route id. The source tree is never mutated — every node is rebuilt via
 * `createRootRouteWithContext`/`createRoute`, so the clone can be mounted in an
 * isolated test router without leaking state back to the imported tree.
 *
 * @param rootRoute - Any route in the target tree, or its root. The enclosing
 *   root is located by walking `getParentRoute`; pass the root directly when
 *   you already have it.
 * @param overrides - Optional per-route overrides keyed by route id (see
 *   {@link RouteOverrides}). Real loaders/guards run for every route you omit.
 * @returns The cloned {@link ClonedRouteTree}: a fresh root plus a map from the
 *   original route ids to their cloned counterparts.
 *
 * @remarks
 * Cloning is leak-proof by construction: unlike mutate-and-restore isolation,
 * it is safe even when several routers share the same source tree at once (e.g.
 * `test.concurrent`).
 *
 * @example
 * ```ts
 * const { root } = cloneRouteTree(routeTree, {
 *   '/_authed': { beforeLoad: () => ({ user: stubUser }) },
 *   '/posts/$postId': { loader: async () => ({ id: 7, title: 'Mock' }) },
 * });
 * const router = createTestRouter({ routeTree: root, initialEntries: ['/posts/7'] });
 * ```
 */
export const cloneRouteTree = (rootRoute: AnyRoute, overrides?: RouteOverrides): ClonedRouteTree => {
  const root = rootRoute.isRoot ? rootRoute : findRoot(rootRoute);
  initSourceTree(root, { i: 0 });

  const byId = new Map<string, AnyRoute>();
  const { id: _id, getParentRoute: _getParentRoute, ...restRoot } = routeOpts(root);
  // Always build a fresh root: reusing the caller's root across routers is what
  // triggers TanStack's "Duplicate routeIds found: __root__".
  const rootOptions: RouteOpts = { ...restRoot, ...getOverrideFor(overrides, '__root__') };
  const newRoot = makeRootRoute(rootOptions);
  byId.set('__root__', newRoot);

  const children = childrenOf(root);
  if (children !== undefined && children.length > 0) {
    newRoot.addChildren(children.map(child => cloneChild(child, newRoot, overrides, byId)));
  }
  return { root: newRoot, byId };
};

const MAX_PARENT_WALK = 50;

const findRoot = (route: AnyRoute): AnyRoute => {
  let current: AnyRoute = route;
  for (let i = 0; i < MAX_PARENT_WALK && !current.isRoot; i += 1) {
    const getParent = routeOpts(current).getParentRoute as (() => AnyRoute) | undefined;
    const parent = getParent?.();
    if (!parent) break;
    current = parent;
  }
  return current;
};
