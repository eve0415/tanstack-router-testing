/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/with-trpc-react-query`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '../../../../../vendor/examples/react/with-trpc-react-query/src/routeTree.gen.ts';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: with-trpc-react-query', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
