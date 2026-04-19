import { describe, expect, it } from 'vitest';

import { createTestHistory } from './history.ts';

describe('createTestHistory', () => {
  it('defaults to ["/"] when no options are passed', () => {
    const history = createTestHistory();
    expect(history.location.pathname).toBe('/');
  });

  it('respects initialEntries', () => {
    const history = createTestHistory({ initialEntries: ['/orders/42'] });
    expect(history.location.pathname).toBe('/orders/42');
  });

  it('respects a non-zero initialIndex', () => {
    const history = createTestHistory({
      initialEntries: ['/a', '/b', '/c'],
      initialIndex: 1,
    });
    expect(history.location.pathname).toBe('/b');
  });

  it('defaults to last entry when initialIndex is omitted', () => {
    const history = createTestHistory({ initialEntries: ['/a', '/b', '/c'] });
    expect(history.location.pathname).toBe('/c');
  });

  it('treats initialIndex: 0 as the last entry (upstream truthiness-check behavior)', () => {
    // Upstream @tanstack/history 1.161 uses `opts.initialIndex ? ... : last`
    // instead of a `!== undefined` check, so 0 falls through to last.
    // Documented as a known limitation on CreateTestHistoryOptions.initialIndex.
    const history = createTestHistory({
      initialEntries: ['/a', '/b', '/c'],
      initialIndex: 0,
    });
    expect(history.location.pathname).toBe('/c');
  });

  it('supports navigation (push / back)', () => {
    const history = createTestHistory({ initialEntries: ['/'] });
    history.push('/next');
    expect(history.location.pathname).toBe('/next');
    history.back();
    expect(history.location.pathname).toBe('/');
  });
});
