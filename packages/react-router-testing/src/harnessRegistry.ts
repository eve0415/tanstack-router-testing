/**
 * Minimal cleanup interface — only the `cleanup` method is needed for
 * registry tracking. Avoids importing runtime types from `@tanstack/react-router`.
 */
interface CleanableHarness {
  cleanup: () => void;
}

const activeHarnesses = new Set<CleanableHarness>();

/**
 * Register a harness for automatic cleanup tracking.
 *
 * @param harness - The harness instance to track.
 * @remarks Called internally by `createRouterHarness`. Not part of public API.
 */
export const trackHarness = (harness: CleanableHarness): void => {
  activeHarnesses.add(harness);
};

/**
 * Remove a harness from the active tracking set.
 *
 * @param harness - The harness instance to untrack.
 * @remarks Called internally by harness.cleanup(). Not part of public API.
 */
export const untrackHarness = (harness: CleanableHarness): void => {
  activeHarnesses.delete(harness);
};

/**
 * Remove and clean up all active router harnesses.
 *
 * @remarks Intended for use in Vitest setup files via `afterEach`.
 * Import `@tanstack-router-testing/react-router-testing/cleanup` instead
 * of calling this directly — it wires up the `afterEach` hook for you.
 *
 * @example
 * ```ts
 * import { afterEach } from 'vitest';
 * import { cleanupAllHarnesses } from '@tanstack-router-testing/react-router-testing';
 *
 * afterEach(() => {
 *   cleanupAllHarnesses();
 * });
 * ```
 */
export const cleanupAllHarnesses = (): void => {
  for (const harness of activeHarnesses) {
    harness.cleanup();
  }
  activeHarnesses.clear();
};
