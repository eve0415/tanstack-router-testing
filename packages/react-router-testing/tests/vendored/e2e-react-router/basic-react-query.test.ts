/**
 * Auto-generated smoke test for vendored app `vendor/e2e/react-router/basic-react-query`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: basic-react-query', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/e2e/react-router/basic-react-query/src/main.tsx'));
});
