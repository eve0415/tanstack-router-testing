/**
 * Browser-safe subset of `@tanstack-router-testing/react-start-testing`.
 *
 * Use this entry point in browser test setup files to avoid pulling in
 * `node:async_hooks` via the full barrel export.
 *
 * @example
 * ```ts
 * // test/setup.browser.ts
 * import { clearStartMocks } from '@tanstack-router-testing/react-start-testing/browser';
 *
 * afterEach(() => {
 *   clearStartMocks();
 * });
 * ```
 */

export { clearStartMocks } from './clearStartMocks.ts';
export { type AnyServerFn, mockServerFn, type ServerFnMock } from './mockServerFn.ts';
export { type MockMiddlewareOptions, mockMiddleware } from './mockMiddleware.ts';
export { runInStartEnv } from './isomorphic.ts';
