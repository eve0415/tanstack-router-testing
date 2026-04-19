/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-router/sentry-integration`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: sentry-integration', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/e2e/react-router/sentry-integration/src/main.tsx'));
});
