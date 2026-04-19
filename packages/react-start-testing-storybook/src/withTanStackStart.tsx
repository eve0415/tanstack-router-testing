import type { Decorator } from '@storybook/react';
import type { AnyServerFn, ServerFnMock } from '@tanstack-router-testing/react-start-testing';
import type { AnyRoute } from '@tanstack/router-core';
import type { ReactElement } from 'react';

import { createTestRouter } from '@tanstack-router-testing/react-router-testing';
import { mockServerFn } from '@tanstack-router-testing/react-start-testing';
import { RouterContextProvider } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';

/**
 * Story parameters consumed by {@link withTanStackStart}.
 *
 * Place under `parameters.tanstackStart` on a CSF3 story to drive the
 * TanStack Start context inside the preview.
 *
 * @typeParam TRouteTree - The route tree type. Inferred when routeTree
 *                          is passed; explicit annotation needed for
 *                          fully-typed `initialEntries`.
 */
type ServerFnMockPair<TFn extends AnyServerFn = AnyServerFn> = readonly [TFn, ServerFnMock<TFn>];

export interface TanStackStartStoryParameters<TRouteTree extends AnyRoute = AnyRoute> {
  /** The route tree for the story's router. */
  readonly routeTree: TRouteTree;
  /** Initial navigation entries; last one is active. */
  readonly initialEntries?: readonly string[];
  /** Router context bag as declared by the root route. */
  readonly context?: Record<string, unknown>;
  /**
   * Array of `[serverFn, mockImplementation]` tuples. Each pair is
   * installed via {@link mockServerFn} before the story renders and
   * torn down afterwards.
   */
  readonly serverFnMocks?: readonly ServerFnMockPair[];
}

/**
 * Storybook decorator that wraps the story in a `<RouterProvider>` backed
 * by {@link createTestRouter}, and installs any `serverFnMocks` passed
 * via story parameters.
 *
 * @returns A Storybook decorator.
 *
 * @example
 * ```ts
 * // .storybook/preview.ts
 * import { withTanStackStart } from '@tanstack-router-testing/react-start-testing-storybook';
 * export const decorators = [withTanStackStart()];
 *
 * // story.tsx
 * import { routeTree } from '../src/routeTree.gen';
 * import { listOrders } from '../src/server/orders';
 * export const Default: Story = {
 *   parameters: {
 *     tanstackStart: {
 *       routeTree,
 *       initialEntries: ['/orders/42'],
 *       context: { auth: stubAuth },
 *       serverFnMocks: [[listOrders, async () => [{ id: 1, total: 42 }]]],
 *     },
 *   },
 * };
 * ```
 */
export const withTanStackStart = (): Decorator => {
  const Decorated = (Story: unknown, context: { parameters?: { tanstackStart?: TanStackStartStoryParameters } }): ReactElement => {
    const params = context.parameters?.tanstackStart;
    if (!params) {
      throw new Error(
        '[tanstack-router-testing-storybook] withTanStackStart: parameters.tanstackStart is required. Provide at least { routeTree } on the story.',
      );
    }
    const router = useMemo(
      () =>
        createTestRouter({
          routeTree: params.routeTree,
          ...(params.initialEntries !== undefined ? { initialEntries: params.initialEntries } : {}),
          ...(params.context !== undefined ? { context: params.context } : { context: {} }),
        }),
      [params.routeTree, params.initialEntries, params.context],
    );
    useEffect(() => {
      const disposers = (params.serverFnMocks ?? []).map(([fn, impl]) => mockServerFn(fn, impl));
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, [params.serverFnMocks]);
    const StoryComponent = Story as () => ReactElement;
    return (
      <RouterContextProvider router={router}>
        <StoryComponent />
      </RouterContextProvider>
    );
  };
  return Decorated as Decorator;
};
