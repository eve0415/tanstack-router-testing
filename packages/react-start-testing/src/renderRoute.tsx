import type { AnyServerFn, ServerFnMock } from './mockServerFn.ts';
import type { RouteOverrides, RouterHarness } from '@tanstack-router-testing/react-router-testing';
import type { AnyRouter } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/router-core';
import type { RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';

import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';

import { mockServerFn } from './mockServerFn.ts';

let _render: ((ui: ReactElement) => RenderResult) | undefined;
const resolveRender = async (): Promise<(ui: ReactElement) => RenderResult> => {
  if (_render) return _render;
  try {
    const mod = await import('@testing-library/react');
    _render = mod.render as (ui: ReactElement) => RenderResult;
    return _render;
  } catch {
    throw new Error('[tanstack-router-testing] renderRoute requires @testing-library/react. Install it: pnpm add -D @testing-library/react');
  }
};

/**
 * A `[serverFn, mockImplementation]` pair installed before the route renders.
 *
 * @typeParam TFn - The server function type; the mock is checked against it.
 */
export type ServerFnMockPair<TFn extends AnyServerFn = AnyServerFn> = readonly [TFn, ServerFnMock<TFn>];

/**
 * Options for {@link renderRoute}.
 */
export interface RenderRouteOptions {
  /** The route tree to mount. */
  readonly routeTree: AnyRoute;
  /** Initial navigation entries; the last one is active. Defaults to `['/']`. */
  readonly initialEntries?: readonly string[];
  /** Index into `initialEntries` to start at. */
  readonly initialIndex?: number;
  /** Router context passed to `beforeLoad`/`loader`. */
  readonly context?: Record<string, unknown>;
  /**
   * Per-route option overrides keyed by route id. The tree is structurally
   * cloned, so the source tree is never mutated. See {@link RouteOverrides}.
   */
  readonly overrides?: RouteOverrides;
  /**
   * `[serverFn, mock]` pairs installed via {@link mockServerFn} before render
   * and disposed on {@link RenderRouteResult.unmount}.
   */
  readonly serverFnMocks?: readonly ServerFnMockPair[];
  /** Optional `QueryClient` for `@tanstack/react-query` integration. */
  readonly queryClient?: object;
}

/**
 * Result of {@link renderRoute}: the full React Testing Library render result
 * plus the underlying {@link RouterHarness}.
 */
export interface RenderRouteResult extends RenderResult {
  /** The router harness backing the render, for state assertions and navigation. */
  readonly harness: RouterHarness<AnyRouter>;
}

/**
 * Mount a route tree at a location with server-function mocks and per-route
 * overrides — the router, mocks, render, and load happen in one call.
 *
 * Wires {@link createRouterHarness} (with `overrides`), installs each
 * `serverFnMocks` pair via {@link mockServerFn}, loads the router, and renders
 * it through React Testing Library. It is the declarative counterpart to
 * hand-composing `createTestRouter` + `mockServerFn` + `render`.
 *
 * @param options - {@link RenderRouteOptions} describing the tree, location,
 *   context, overrides, and server-function mocks.
 * @returns A promise resolving to the {@link RenderRouteResult}: RTL queries
 *   plus the `harness`. Requires `@testing-library/react` to be installed.
 *
 * @remarks
 * The returned `unmount` disposes the installed mocks and tears down the
 * harness in addition to unmounting the DOM; it is idempotent, so it composes
 * safely with the standard `clearStartMocks` / `cleanupAllHarnesses` teardown.
 *
 * @example
 * ```tsx
 * import { routeTree } from './routeTree.gen';
 * import { listOrders } from './server/orders';
 *
 * const screen = await renderRoute({
 *   routeTree,
 *   initialEntries: ['/orders/42'],
 *   context: { auth: stubAuth },
 *   overrides: { '/_authed': { beforeLoad: () => ({ user: stubUser }) } },
 *   serverFnMocks: [[listOrders, async () => [{ id: 1, total: 42 }]]],
 * });
 * await screen.findByText('Order 42');
 * expect(screen.harness.getLoaderData('/orders/$id')).toBeDefined();
 * ```
 */
export const renderRoute = async (options: RenderRouteOptions): Promise<RenderRouteResult> => {
  const { routeTree, serverFnMocks, ...harnessOptions } = options;
  const harness = createRouterHarness({ routeTree, ...harnessOptions });
  const disposers = (serverFnMocks ?? []).map(([fn, impl]) => mockServerFn(fn, impl));

  await harness.load();
  const render = await resolveRender();
  const result = render(<harness.TestRouterProvider />);

  let disposed = false;
  const unmount = (): void => {
    if (disposed) return;
    disposed = true;
    for (const dispose of disposers) dispose();
    harness.cleanup();
    result.unmount();
  };

  return { ...result, harness, unmount };
};
