import { afterEach } from 'vitest';

import { cleanupAllHarnesses } from './createRouterHarness.tsx';

afterEach(() => {
  cleanupAllHarnesses();
});
