import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CLEANUP_PATH = resolve(import.meta.dirname, '../../dist/cleanup.mjs');

describe('cleanup.mjs build output', () => {
  it('does not statically import @tanstack/react-router', () => {
    const content = readFileSync(CLEANUP_PATH, 'utf8');
    expect(content).not.toContain('@tanstack/react-router');
  });

  it('does not import the shared createRouterHarness chunk', () => {
    const content = readFileSync(CLEANUP_PATH, 'utf8');
    expect(content).not.toContain('createRouterHarness');
  });

  it('imports from vitest for afterEach', () => {
    const content = readFileSync(CLEANUP_PATH, 'utf8');
    expect(content).toContain('vitest');
  });
});
