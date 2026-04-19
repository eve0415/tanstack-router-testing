/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-router/generator-cli-only`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/e2e/react-router/generator-cli-only/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: generator-cli-only', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
