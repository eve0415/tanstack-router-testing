/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/start-basic-auth`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/examples/react/start-basic-auth/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: start-basic-auth', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
