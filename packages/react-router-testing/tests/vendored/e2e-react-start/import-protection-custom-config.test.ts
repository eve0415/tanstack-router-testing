/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-start/import-protection-custom-config`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/e2e/react-start/import-protection-custom-config/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: import-protection-custom-config', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
