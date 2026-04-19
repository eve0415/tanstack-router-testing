/**
 * Upstream-shaped test helpers for `@tanstack/react-router`.
 *
 * The public surface is intentionally small:
 *
 * - {@link createTestRouter} — wrap `createRouter` + `createMemoryHistory`.
 * - {@link createRouterHarness} — create a router plus provider component.
 *
 * Tests should exercise loaders, guards, params, search, and redirects through
 * a real router instance rather than isolated route-option invocation.
 */

export { createRouterHarness, type RouterHarness } from './createRouterHarness.tsx';
export { type CreateTestRouterMemoryOptions, type CreateTestRouterOptions, createTestRouter } from './createTestRouter.ts';

/**
 * Current package version. Bumped at release time.
 */
export const VERSION = '0.0.0';
