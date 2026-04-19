import { afterEach, describe, expect, it } from 'vitest';

import { __resetServerFnRegistry, clearAllServerFnMocks, getServerFnEntry, registerServerFn, setServerFnMock } from './server-fn-registry.ts';

describe('server-fn-registry', () => {
  afterEach(() => {
    __resetServerFnRegistry();
  });

  it('registerServerFn stores the original and returns the entry', () => {
    const fn = () => 'result';
    const original = () => 'original';
    const entry = registerServerFn(fn, original);
    expect(entry.original).toBe(original);
    expect(entry.mock).toBeUndefined();
  });

  it('registerServerFn is idempotent', () => {
    const fn = () => 'result';
    const original = () => 'original';
    const first = registerServerFn(fn, original);
    const second = registerServerFn(fn, () => 'different');
    expect(second).toBe(first);
    expect(second.original).toBe(original);
  });

  it('getServerFnEntry returns undefined for unregistered fn', () => {
    const fn = () => 'result';
    expect(getServerFnEntry(fn)).toBeUndefined();
  });

  it('setServerFnMock swaps and restores the mock', () => {
    const fn = () => 'result';
    const original = () => 'original';
    const mock = () => 'mock';
    registerServerFn(fn, original);
    const restore = setServerFnMock(fn, mock);
    expect(getServerFnEntry(fn)?.mock).toBe(mock);
    restore();
    expect(getServerFnEntry(fn)?.mock).toBeUndefined();
  });

  it('setServerFnMock stacks — nested mocks restore in order', () => {
    const fn = () => 'result';
    const original = () => 'original';
    const mockA = () => 'A';
    const mockB = () => 'B';
    registerServerFn(fn, original);
    const restoreA = setServerFnMock(fn, mockA);
    const restoreB = setServerFnMock(fn, mockB);
    expect(getServerFnEntry(fn)?.mock).toBe(mockB);
    restoreB();
    expect(getServerFnEntry(fn)?.mock).toBe(mockA);
    restoreA();
    expect(getServerFnEntry(fn)?.mock).toBeUndefined();
  });

  it('setServerFnMock throws for unregistered fn', () => {
    const fn = () => 'result';
    const mock = () => 'mock';
    expect(() => setServerFnMock(fn, mock)).toThrow(/unregistered server fn/);
  });

  it('clearAllServerFnMocks clears every mock but preserves originals', () => {
    const fnA = () => 'a';
    const fnB = () => 'b';
    registerServerFn(fnA, () => 'origA');
    registerServerFn(fnB, () => 'origB');
    setServerFnMock(fnA, () => 'mockA');
    setServerFnMock(fnB, () => 'mockB');
    clearAllServerFnMocks();
    expect(getServerFnEntry(fnA)?.mock).toBeUndefined();
    expect(getServerFnEntry(fnB)?.mock).toBeUndefined();
    expect(getServerFnEntry(fnA)?.original).toBeDefined();
    expect(getServerFnEntry(fnB)?.original).toBeDefined();
  });
});
