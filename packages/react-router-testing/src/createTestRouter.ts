import type { RouterHistory } from '@tanstack/history';
import type { Router } from '@tanstack/react-router';
import type { AnyRoute, RouterConstructorOptions, TrailingSlashOption } from '@tanstack/router-core';

import { createMemoryHistory } from '@tanstack/history';
import { createRouter } from '@tanstack/react-router';

/**
 * Memory history options used when a test does not supply its own history.
 */
export interface CreateTestRouterMemoryOptions {
  /**
   * Initial history entries. Defaults to `['/']`.
   */
  readonly initialEntries?: readonly string[];
  /**
   * Index into `initialEntries` to start at.
   */
  readonly initialIndex?: number;
}

type TestRouterBaseOptions<
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
> = RouterConstructorOptions<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated>;

type CreateTestRouterWithMemoryOptions<
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption,
  TDefaultStructural extends boolean,
  TDehydrated extends Record<string, unknown>,
> = Omit<TestRouterBaseOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated>, 'history'> &
  CreateTestRouterMemoryOptions & {
    readonly history?: never;
  };

type CreateTestRouterWithHistoryOptions<
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption,
  TDefaultStructural extends boolean,
  TDehydrated extends Record<string, unknown>,
> = TestRouterBaseOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated> & {
  readonly initialEntries?: never;
  readonly initialIndex?: never;
};

/**
 * Options for {@link createTestRouter}.
 *
 * The shape intentionally mirrors `createRouter`. Tests may either pass a
 * production-shaped `history`, or omit it and let the helper create a memory
 * history from `initialEntries` / `initialIndex`.
 */
export type CreateTestRouterOptions<
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
> =
  | CreateTestRouterWithMemoryOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated>
  | CreateTestRouterWithHistoryOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated>;

/**
 * Build a {@link Router} configured for in-memory, in-test use.
 *
 * Thin wrapper around {@link createRouter}. It defaults to memory history and
 * `defaultPendingMinMs: 0`, then forwards every other router option verbatim.
 *
 * @typeParam TRouteTree - The route tree type.
 * @param options - Router options with optional memory-history fields.
 * @returns The router, typed so `router.navigate({ to })`, `router.state`,
 *          and every other hook are constrained by `routeTree` in the same
 *          way they would be in production.
 *
 * @example
 * ```ts
 * import { createTestRouter } from '@tanstack-router-testing/react-router-testing';
 * import { routeTree } from './routeTree.gen';
 *
 * const router = createTestRouter({
 *   routeTree,
 *   initialEntries: ['/orders/42'],
 *   context: { auth: stubAuth },
 * });
 * ```
 */
export const createTestRouter = <
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateTestRouterOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated>,
): Router<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated> => {
  const { initialEntries, initialIndex, ...routerOptions } = options;
  const providedHistory = 'history' in routerOptions ? routerOptions.history : undefined;

  if (providedHistory !== undefined && (initialEntries !== undefined || initialIndex !== undefined)) {
    throw new Error('[tanstack-router-testing] createTestRouter: pass either history or initialEntries/initialIndex, not both.');
  }

  const history =
    providedHistory ??
    createMemoryHistory({
      initialEntries: [...(initialEntries ?? ['/'])],
      ...(initialIndex !== undefined ? { initialIndex } : {}),
    });

  return createRouter({
    defaultPendingMinMs: 0,
    ...(routerOptions as unknown as RouterConstructorOptions<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated>),
    history,
  });
};
