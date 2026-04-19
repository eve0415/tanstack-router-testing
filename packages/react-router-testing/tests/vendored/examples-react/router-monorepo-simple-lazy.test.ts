/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/router-monorepo-simple-lazy`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/examples/react/router-monorepo-simple-lazy/packages/router/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: router-monorepo-simple-lazy', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
