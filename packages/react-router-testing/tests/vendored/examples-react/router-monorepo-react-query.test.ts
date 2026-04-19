/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/router-monorepo-react-query`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/examples/react/router-monorepo-react-query/packages/router/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: router-monorepo-react-query', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
