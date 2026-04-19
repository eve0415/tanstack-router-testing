/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/quickstart`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: quickstart', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/quickstart/src/main.tsx'));
});
