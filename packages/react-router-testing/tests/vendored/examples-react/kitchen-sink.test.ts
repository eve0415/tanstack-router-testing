/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/kitchen-sink`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: kitchen-sink', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/kitchen-sink/src/main.tsx'));
});
