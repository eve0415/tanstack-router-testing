/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/start-counter`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/examples/react/start-counter/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: start-counter', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
