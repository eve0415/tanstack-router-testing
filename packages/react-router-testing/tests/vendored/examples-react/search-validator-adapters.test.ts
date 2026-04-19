/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/search-validator-adapters`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/examples/react/search-validator-adapters/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: search-validator-adapters', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
