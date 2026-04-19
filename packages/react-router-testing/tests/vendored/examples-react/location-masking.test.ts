/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/location-masking`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: location-masking', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/location-masking/src/main.tsx'));
});
