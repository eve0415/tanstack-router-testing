import { clearAllMiddlewareMocks, clearAllServerFnMocks } from '@tanstack-router-testing/router-testing-core';

/**
 * Clear every server-function and middleware mock installed by
 * {@link mockServerFn} or {@link mockMiddleware}.
 *
 * @returns `void`.
 *
 * @example
 * ```ts
 * import { afterEach } from 'vitest';
 * import { clearStartMocks } from '@tanstack-router-testing/react-start-testing';
 *
 * afterEach(() => {
 *   clearStartMocks();
 * });
 * ```
 *
 * @remarks
 * This is the same function wired to {@link StartTestRuntime.cleanup}, so you
 * only need to call it explicitly when installing mocks outside of a runtime
 * (i.e. via {@link mockServerFn} / {@link mockMiddleware} directly).
 */
export const clearStartMocks = (): void => {
  clearAllServerFnMocks();
  clearAllMiddlewareMocks();
};
