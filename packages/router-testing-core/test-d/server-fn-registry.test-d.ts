import type { ServerFnEntry } from '../src/server-fn-registry.ts';

import { getServerFnEntry, registerServerFn, setServerFnMock } from '../src/server-fn-registry.ts';

const fn = (..._args: readonly unknown[]): unknown => 42;
const impl = (..._args: readonly unknown[]): unknown => 42;

// registerServerFn returns an entry with readonly `original`.
const entry: ServerFnEntry = registerServerFn(fn, impl);
void entry;

// entry.original is readonly — assigning is a type error.
// @ts-expect-error — `original` is `readonly`.
entry.original = impl;

// entry.mock is writable.
entry.mock = impl;

// getServerFnEntry returns entry or undefined.
const maybeEntry: ServerFnEntry | undefined = getServerFnEntry(fn);
void maybeEntry;

// setServerFnMock accepts a function or undefined, returns a disposer.
const restore: () => void = setServerFnMock(fn, impl);
restore();

// @ts-expect-error — second arg can't be a raw value (must be a fn or undefined).
setServerFnMock(fn, 42);
