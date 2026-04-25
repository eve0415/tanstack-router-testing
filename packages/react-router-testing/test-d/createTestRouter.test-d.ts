import { createMemoryHistory } from '@tanstack/history';
import { createRootRoute } from '@tanstack/react-router';

import { createRouterHarness } from '../src/createRouterHarness.tsx';
import { createTestRouter } from '../src/createTestRouter.ts';

const rootRoute = createRootRoute();
const routeTree = rootRoute;

// Basic call is accepted.
const router = createTestRouter({
  routeTree,
  initialEntries: ['/'],
});
void router;

// context is forwarded.
createTestRouter({
  routeTree,
  context: { auth: { id: 'u1' } },
});

// custom history is accepted.
createTestRouter({
  routeTree,
  history: createMemoryHistory(),
});

// harness returns the same typed router plus a provider component.
const harness = createRouterHarness({ routeTree, initialEntries: ['/'] });
void harness.router;
void harness.TestRouterProvider;
void harness.load();
void harness.match('/');
void harness.getMatch('__root__');
void harness.getLoaderData('__root__');
void harness.getRouteContext('__root__');
void harness.getSearch('__root__');
void harness.getParams('__root__');
 harness.cleanup();

// @ts-expect-error — initialEntries must be strings.
createTestRouter({ routeTree, initialEntries: [1] });

// @ts-expect-error — initialIndex must be a number.
createTestRouter({ routeTree, initialIndex: '0' });

// @ts-expect-error — callers must not combine custom history with memory history options.
createTestRouter({ routeTree, history: createMemoryHistory(), initialEntries: ['/'] });
