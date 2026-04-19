/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-router/basic-scroll-restoration`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: basic-scroll-restoration', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/e2e/react-router/basic-scroll-restoration/src/main.tsx'));
});
