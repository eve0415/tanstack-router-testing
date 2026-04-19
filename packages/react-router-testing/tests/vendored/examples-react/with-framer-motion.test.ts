/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/with-framer-motion`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: with-framer-motion', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/with-framer-motion/src/main.tsx'));
});
