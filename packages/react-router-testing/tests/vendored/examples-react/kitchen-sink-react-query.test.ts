/**
 * Auto-generated smoke test for vendored app `vendor/examples/react/kitchen-sink-react-query`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: kitchen-sink-react-query', () => {
  assertVendoredAppEntryHarness(() => import('../../../../../vendor/examples/react/kitchen-sink-react-query/src/main.tsx'));
});
