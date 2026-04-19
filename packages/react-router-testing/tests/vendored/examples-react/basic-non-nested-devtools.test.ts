/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/basic-non-nested-devtools`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: basic-non-nested-devtools', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/basic-non-nested-devtools/src/main.tsx'));
});
