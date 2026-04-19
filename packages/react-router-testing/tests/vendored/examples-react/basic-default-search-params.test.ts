/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/basic-default-search-params`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: basic-default-search-params', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/basic-default-search-params/src/main.tsx'));
});
