/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/scroll-restoration`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: scroll-restoration', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/scroll-restoration/src/main.tsx'));
});
