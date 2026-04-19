import { describe, expect, it } from 'vitest';

describe('ssr helpers', () => {
  it('keeps ssr helpers outside the v1 public testing surface', async () => {
    const publicApi = await import('../../src/index.ts');
    expect('renderSSR' in publicApi).toBeFalsy();
    expect('hydrateAndAssert' in publicApi).toBeFalsy();
  });
});
