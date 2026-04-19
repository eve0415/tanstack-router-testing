/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/large-file-based`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/examples/react/large-file-based/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: large-file-based', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
