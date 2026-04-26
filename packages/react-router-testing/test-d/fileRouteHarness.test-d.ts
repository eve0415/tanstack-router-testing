import { expectTypeOf } from 'vitest';

import { createRootRoute, createRoute } from '@tanstack/react-router';

import { createRouterHarness } from '../src/index.ts';
import type { FileRouteHarnessOptions } from '../src/index.ts';

const rootRoute = createRootRoute();

const typedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$postId',
  validateSearch: (input: Record<string, unknown>) => ({
    page: Number(input.page ?? 1),
  }),
  loader: ({ params }: { params: { postId: string } }) => ({
    post: { id: params.postId, title: `Post ${params.postId}` },
  }),
});

rootRoute.addChildren([typedRoute]);

// FileRouteHarnessOptions infers params from route.
expectTypeOf<FileRouteHarnessOptions<typeof typedRoute>['params']>()
  .toEqualTypeOf<{ postId: string } | undefined>();

// FileRouteHarnessOptions infers search from route.
expectTypeOf<FileRouteHarnessOptions<typeof typedRoute>['search']>()
  .toEqualTypeOf<{ page: number } | undefined>();

// FileRouteHarnessOptions infers loaderData from route.
expectTypeOf<FileRouteHarnessOptions<typeof typedRoute>['loaderData']>()
  .toEqualTypeOf<{ post: { id: string; title: string } } | undefined>();

// createRouterHarness with route option returns RouterHarness.
const harness = createRouterHarness({
  route: typedRoute,
  params: { postId: '42' },
  search: { page: 3 },
});
expectTypeOf(harness.router).toHaveProperty('navigate');
expectTypeOf(harness.load).toBeFunction();
expectTypeOf(harness.cleanup).toBeFunction();

// @ts-expect-error — wrong param name should be caught
createRouterHarness({ route: typedRoute, params: { wrongParam: '1' } });

// @ts-expect-error — wrong search type should be caught
createRouterHarness({ route: typedRoute, params: { postId: '1' }, search: { page: 'not-a-number' } });
