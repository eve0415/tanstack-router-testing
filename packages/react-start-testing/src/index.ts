/**
 * Upstream-shaped test helpers for `@tanstack/react-start`.
 *
 * Server functions are called directly in tests, exactly as production code
 * calls them. This package only exposes mock and environment controls.
 */

export { type CallMiddlewareOptions, type CallMiddlewareResult, callMiddleware } from '@tanstack-router-testing/router-testing-core';
export { clearStartMocks } from './clearStartMocks.ts';
export { type AnyServerFn, mockServerFn, type ServerFnMock } from './mockServerFn.ts';
export { type MockMiddlewareOptions, mockMiddleware } from './mockMiddleware.ts';
export { runInStartEnv } from './isomorphic.ts';
export { createRscTestRuntime, type RscRenderResult, type RscTestRuntime, type RscTestRuntimeOptions } from './rsc.tsx';
export { createStartTestRuntime, type StartTestRuntime, type StartTestRuntimeOptions, type StartTestRunOptions } from './runtime.ts';

/**
 * Current package version. Bumped at release time.
 */
export const VERSION = '0.0.0';
