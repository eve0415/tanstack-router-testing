/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/basic-react-query`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: basic-react-query', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/basic-react-query/src/main.tsx'));
});
