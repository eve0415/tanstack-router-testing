/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-start/dev-ssr-styles`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/e2e/react-start/dev-ssr-styles/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: dev-ssr-styles', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
