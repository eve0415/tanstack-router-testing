import type { CreateTestHistoryOptions } from '../src/history.ts';
import type { RouterHistory } from '@tanstack/history';

import { expectTypeOf } from 'vitest';

import { createTestHistory } from '../src/history.ts';

// Returns RouterHistory.
const history: RouterHistory = createTestHistory();
void history;

expectTypeOf(createTestHistory).returns.toEqualTypeOf<RouterHistory>();

// Options accept initialEntries as readonly string[].
createTestHistory({ initialEntries: ['/a', '/b'] });

// initialIndex is optional number.
createTestHistory({ initialEntries: ['/a'], initialIndex: 0 });

// @ts-expect-error — initialEntries must be strings.
createTestHistory({ initialEntries: [1, 2] });

// @ts-expect-error — initialIndex must be a number.
createTestHistory({ initialEntries: ['/'], initialIndex: '0' });

// Interface shape is exported.
const _opts: CreateTestHistoryOptions = {};
void _opts;
