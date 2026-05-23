/**
 * Upstream-shaped test helpers for `@tanstack/react-router`.
 *
 * The public surface is intentionally small:
 *
 * - {@link createTestRouter} — wrap `createRouter` + `createMemoryHistory`.
 * - {@link createRouterHarness} — create a router plus provider component.
 *   Accepts either `routeTree` (full tree) or `route` (single file route).
 *
 * Tests should exercise loaders, guards, params, search, and redirects through
 * a real router instance rather than isolated route-option invocation.
 */

export { cleanupAllHarnesses, createRouterHarness, type FileRouteHarnessOptions, type RouterHarness } from './createRouterHarness.tsx';
export { type CreateTestRouterMemoryOptions, type CreateTestRouterOptions, createTestRouter } from './createTestRouter.ts';
export { computeFullPath, neuterAncestorLoaders, walkToRoot } from './fileRouteUtils.ts';
export type { CreateRouterSsrHarnessOptions, HydrateRouterSsrOptions, RouterSsrHarness, RouterSsrMode } from './ssr.tsx';

/**
 * Current package version. Bumped at release time.
 */
export const VERSION = '0.0.0';
