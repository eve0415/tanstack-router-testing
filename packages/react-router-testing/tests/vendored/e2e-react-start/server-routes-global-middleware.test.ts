/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-start/server-routes-global-middleware`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/e2e/react-start/server-routes-global-middleware/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: server-routes-global-middleware', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
