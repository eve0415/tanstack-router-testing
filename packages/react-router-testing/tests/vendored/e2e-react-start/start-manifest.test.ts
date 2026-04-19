/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-start/start-manifest`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/e2e/react-start/start-manifest/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: start-manifest', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
