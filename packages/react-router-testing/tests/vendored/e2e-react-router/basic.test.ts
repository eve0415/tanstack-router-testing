/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-router/basic`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: basic', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/e2e/react-router/basic/src/main.tsx'));
});
