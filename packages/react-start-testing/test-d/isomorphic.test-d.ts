import { runInStartEnv } from '../src/isomorphic.ts';
import { mockServerFn } from '../src/mockServerFn.ts';
import { createStartTestRuntime } from '../src/runtime.ts';

// runInStartEnv narrows return to the callback's type.
const s: Promise<string> = runInStartEnv('server', () => 'hi');
void s;

const n: Promise<number> = runInStartEnv('client', () => Promise.resolve(42));
void n;

// @ts-expect-error — env must be 'server' | 'client'.
void runInStartEnv('staging', () => 0);

// @ts-expect-error — fn must be a function.
void runInStartEnv('server', 42);

declare const listOrders: (opts: { data: { page: number } }) => Promise<{ id: number }[]>;

const restore = mockServerFn(listOrders, ({ data }) => Promise.resolve([{ id: data.page }]));
void restore;

// @ts-expect-error — mock input must match callable input.
mockServerFn(listOrders, ({ data }: { data: { page: string } }) => Promise.resolve([{ id: data.page }]));

// @ts-expect-error — mock return must match callable return.
mockServerFn(listOrders, ({ data }) => Promise.resolve([{ id: String(data.page) }]));

const runtimePromise = createStartTestRuntime({
  request: 'http://tanstack-router-testing.test/orders',
});
runtimePromise.then(runtime => {
  const value: Promise<number> = runtime.run(() => 1);
  void value;
  const called: Promise<{ id: number }[]> = runtime.call(listOrders, [{ data: { page: 1 } }]);
  void called;
});
