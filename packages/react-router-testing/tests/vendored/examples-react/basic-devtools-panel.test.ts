/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/basic-devtools-panel`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: basic-devtools-panel', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/basic-devtools-panel/src/main.tsx'));
});
