/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/navigation-blocking`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: navigation-blocking', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/navigation-blocking/src/main.tsx'));
});
