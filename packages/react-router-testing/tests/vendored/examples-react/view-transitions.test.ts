/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/view-transitions`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/examples/react/view-transitions/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: view-transitions', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
