import type { RouterHistory } from '@tanstack/history';

import { createMemoryHistory } from '@tanstack/history';

/**
 * Options for {@link createTestHistory}.
 *
 * Forwards exactly to {@link https://tanstack.com/history | `@tanstack/history`'s}
 * `createMemoryHistory` options, with sensible defaults for tests.
 */
export interface CreateTestHistoryOptions {
  /**
   * Initial history entries. The last entry is active unless
   * {@link CreateTestHistoryOptions.initialIndex | `initialIndex`} is set.
   *
   * @defaultValue `['/']`
   */
  readonly initialEntries?: readonly string[];
  /**
   * Index into `initialEntries` to start at.
   *
   * @remarks
   * Upstream `@tanstack/history@1.161` uses a truthiness check on this
   * value (see `packages/history/src/index.ts`), so **passing `0` is
   * treated as "unset" and falls back to the last entry**. If you need
   * to start at the first entry, pass a single-element `initialEntries`
   * array (e.g. `['/a']`) rather than `initialIndex: 0`. This matches
   * upstream behavior and will be revisited if/when upstream fixes the
   * truthiness check.
   *
   * @defaultValue `initialEntries.length - 1` (last entry)
   */
  readonly initialIndex?: number;
}

/**
 * Build a {@link RouterHistory} backed by an in-memory stack, suitable for
 * `createRouter({ history })` in tests.
 *
 * Thin wrapper around {@link createMemoryHistory} — its only job is to
 * provide a default `initialEntries` of `['/']` so tests that don't care
 * about the starting path can omit it entirely. For everything else, pass
 * options through verbatim.
 *
 * @param options - Memory-history options. See {@link CreateTestHistoryOptions}.
 * @returns A {@link RouterHistory} that `@tanstack/react-router`'s
 *          `createRouter` accepts directly.
 *
 * @example
 * ```ts
 * import { createRouter } from '@tanstack/react-router';
 * import { createTestHistory } from '@tanstack-router-testing/router-testing-core';
 * import { routeTree } from './routeTree.gen';
 *
 * const router = createRouter({
 *   routeTree,
 *   history: createTestHistory({ initialEntries: ['/orders/42'] }),
 * });
 * ```
 */
export const createTestHistory = (options: CreateTestHistoryOptions = {}): RouterHistory =>
  createMemoryHistory({
    initialEntries: [...(options.initialEntries ?? ['/'])],
    ...(options.initialIndex !== undefined ? { initialIndex: options.initialIndex } : {}),
  });
