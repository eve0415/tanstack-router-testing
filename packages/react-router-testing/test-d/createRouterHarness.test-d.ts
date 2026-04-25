import { expectTypeOf } from 'vitest';

import type { AnyRouteMatch } from '@tanstack/router-core';

import { createRootRoute, createRoute } from '@tanstack/react-router';

import { createRouterHarness } from '../src/index.ts';
import type { RouterHarness } from '../src/index.ts';

const rootRoute = createRootRoute();
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' });
const tree = rootRoute.addChildren([indexRoute]);
const harness = createRouterHarness({ routeTree: tree });

// harness has correct shape.
expectTypeOf(harness.router).toHaveProperty('navigate');
expectTypeOf(harness.load).toBeFunction();
expectTypeOf(harness.load()).resolves.toBeVoid();
expectTypeOf(harness.cleanup).toBeFunction();

// getMatch returns AnyRouteMatch | undefined.
expectTypeOf(harness.getMatch).returns.toEqualTypeOf<AnyRouteMatch | undefined>();

// getLoaderData/getRouteContext/getSearch/getParams/getError return unknown.
expectTypeOf(harness.getLoaderData).returns.toBeUnknown();
expectTypeOf(harness.getRouteContext).returns.toBeUnknown();
expectTypeOf(harness.getSearch).returns.toBeUnknown();
expectTypeOf(harness.getParams).returns.toBeUnknown();
expectTypeOf(harness.getError).returns.toBeUnknown();

// getRedirect returns a promise of location or undefined.
expectTypeOf(harness.getRedirect).returns.resolves.toEqualTypeOf<
  { readonly pathname: string; readonly search: string; readonly hash: string } | undefined
>();

// match returns readonly AnyRouteMatch[].
expectTypeOf(harness.match).returns.toEqualTypeOf<readonly AnyRouteMatch[]>();

// RouterHarness type is exported and parameterized.
void (0 as unknown as RouterHarness<typeof harness.router>);
