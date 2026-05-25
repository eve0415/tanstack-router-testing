import { afterEach } from 'vitest';

import { cleanupAllHarnesses } from './harnessRegistry.ts';

afterEach(() => {
  cleanupAllHarnesses();
});
