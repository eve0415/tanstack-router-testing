/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/deferred-data`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: deferred-data', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/deferred-data/src/main.tsx'));
});
