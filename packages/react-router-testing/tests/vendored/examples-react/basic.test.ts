/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/basic`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: basic', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/basic/src/main.tsx'));
});
