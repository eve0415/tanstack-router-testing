import type { AnyFn } from '@tanstack-router-testing/router-testing-core';

import { setMiddlewareMock } from '@tanstack-router-testing/router-testing-core';

/**
 * Phase override options for {@link mockMiddleware}. Provide `client`,
 * `server`, or both; omitted keys leave the corresponding phase untouched.
 */
export interface MockMiddlewareOptions {
  /** Override for the `.client()` phase. */
  readonly client?: AnyFn;
  /** Override for the `.server()` phase. */
  readonly server?: AnyFn;
}

/**
 * Override one or both phases of a registered middleware.
 *
 * @param mw - The middleware object (result of
 *             `createMiddleware(...).server(...).client(...)`).
 * @param options - Phase replacements.
 * @returns A no-arg function that restores the prior state.
 *
 * @throws If `mw` is not registered. Registration is the shim's
 *         responsibility (see ADR 0001).
 *
 * Server functions are invoked directly; mocked middleware participates in
 * that normal call path.
 */
export const mockMiddleware = (mw: object, options: MockMiddlewareOptions): (() => void) => setMiddlewareMock(mw, options);
