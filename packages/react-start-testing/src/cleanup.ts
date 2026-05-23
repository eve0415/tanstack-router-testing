// eslint-disable-next-line import/no-unassigned-import -- side-effect: registers router harness afterEach cleanup
import '@tanstack-router-testing/react-router-testing/cleanup';
import { afterEach } from 'vitest';

import { clearStartMocks } from './clearStartMocks.ts';

afterEach(() => {
  clearStartMocks();
});
