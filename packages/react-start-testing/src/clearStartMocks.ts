import { clearAllMiddlewareMocks, clearAllServerFnMocks } from '@tanstack-router-testing/router-testing-core';

/**
 * Clear every Start server-function and middleware mock installed by the
 * testing runtime. Call from `afterEach` when tests install mocks manually.
 */
export const clearStartMocks = (): void => {
  clearAllServerFnMocks();
  clearAllMiddlewareMocks();
};
