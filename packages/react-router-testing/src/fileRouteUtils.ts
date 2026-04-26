import type { AnyRoute } from '@tanstack/router-core';

type RouteOpts = Record<string, unknown>;
const routeOpts = (route: AnyRoute): RouteOpts => route.options as unknown as RouteOpts;

/**
 * Walk from a route to its root ancestor via `getParentRoute`.
 *
 * @param route - Any route in the tree (leaf or intermediate).
 * @returns The root route at the top of the parent chain.
 *
 * @example
 * ```ts
 * import { Route } from './routes/posts.$postId';
 * const root = walkToRoot(Route); // root route of the tree
 * ```
 */
export const walkToRoot = (route: AnyRoute): AnyRoute => {
  let current: AnyRoute = route;
  while (!current.isRoot) {
    const parent = routeOpts(current).getParentRoute as (() => AnyRoute) | undefined;
    if (!parent) break;
    current = parent();
  }
  return current;
};

/**
 * Compute the full URL path for a route by walking up the parent chain.
 *
 * @param route - The route whose full path to compute.
 * @returns The full path string (e.g. `'/posts/$postId'`).
 *
 * @example
 * ```ts
 * import { Route } from './routes/posts.$postId';
 * computeFullPath(Route); // '/posts/$postId'
 * ```
 */
export const computeFullPath = (route: AnyRoute): string => {
  if (route.isRoot) return '/';
  const getParent = routeOpts(route).getParentRoute as (() => AnyRoute) | undefined;
  const parent = getParent?.();
  const segment = (routeOpts(route).path as string) ?? '';
  if (!parent || parent.isRoot) {
    return `/${segment.replace(/^\//, '')}`;
  }
  const parentPath = computeFullPath(parent).replace(/\/$/, '');
  const childSegment = segment.replace(/^\//, '');
  return childSegment ? `${parentPath}/${childSegment}` : parentPath;
};

/**
 * Replace all ancestor loaders with `undefined` for test isolation.
 *
 * @remarks
 * Ancestor `beforeLoad` functions are preserved so that context cascading
 * (auth, permissions, etc.) continues to work. Call the returned function
 * in test cleanup to restore original loaders.
 *
 * @param targetRoute - The route under test. Its own loader is kept intact.
 * @returns A cleanup function that restores the original loaders.
 *
 * @example
 * ```ts
 * const restore = neuterAncestorLoaders(Route);
 * // ... run test ...
 * restore(); // restores original loaders
 * ```
 */
export const neuterAncestorLoaders = (targetRoute: AnyRoute): (() => void) => {
  const saved: { route: AnyRoute; loader: unknown }[] = [];
  const getParent = routeOpts(targetRoute).getParentRoute as (() => AnyRoute) | undefined;
  let current = getParent?.();

  while (current) {
    const o = routeOpts(current);
    if (o.loader !== undefined) {
      saved.push({ route: current, loader: o.loader });
      o.loader = undefined;
    }
    if (current.isRoot) break;
    const nextParent = routeOpts(current).getParentRoute as (() => AnyRoute) | undefined;
    current = nextParent?.();
  }

  return () => {
    for (const { route, loader } of saved) {
      routeOpts(route).loader = loader;
    }
  };
};
