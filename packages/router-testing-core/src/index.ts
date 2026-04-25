/**
 * Framework-agnostic primitives for TanStack Router and TanStack Start test
 * harnesses.
 *
 * This package is the shared floor that `@tanstack-router-testing/react-*`
 * packages build on. It exports no React-specific, Solid-specific, or
 * Vue-specific code — only utilities that any of them can compose:
 *
 * - {@link createTestHistory} — memory history with test-friendly defaults.
 * - {@link getEnv} / {@link setEnv} / {@link runInEnv} — simulate server
 *   or client env for isomorphic code.
 * - {@link registerServerFn} / {@link setServerFnMock} /
 *   {@link clearAllServerFnMocks} — runtime registry for server fns.
 * - {@link registerMiddleware} / {@link setMiddlewareMock} /
 *   {@link clearAllMiddlewareMocks} — runtime registry for Start middleware.
 */

export { type CallMiddlewareOptions, type CallMiddlewareResult, callMiddleware } from './call-middleware.ts';
export { type CreateTestHistoryOptions, createTestHistory } from './history.ts';
export { getEnv, runInEnv, setEnv, type TestEnv } from './env.ts';
export {
  __resetServerFnRegistry,
  type AnyFn,
  clearAllServerFnMocks,
  getServerFnEntry,
  registerServerFn,
  type ServerFnEntry,
  setServerFnMock,
} from './server-fn-registry.ts';
export {
  __resetMiddlewareRegistry,
  clearAllMiddlewareMocks,
  getMiddlewareEntry,
  type MiddlewareEntry,
  type MiddlewareMockOptions,
  registerMiddleware,
  setMiddlewareMock,
} from './middleware-registry.ts';

/**
 * Current package version. Bumped at release time.
 */
export const VERSION = '0.0.0';
