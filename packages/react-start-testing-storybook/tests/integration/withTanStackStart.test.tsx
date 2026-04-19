import { createRootRoute, useRouter } from '@tanstack/react-router';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { withTanStackStart } from '../../src/index.ts';

const rootRoute = createRootRoute({
  component: () => null,
});

describe('withTanStackStart', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the story inside TanStack Router context', async () => {
    const Decorator = withTanStackStart();
    const Story = () => {
      const router = useRouter();
      return <div>story at {router.state.location.pathname}</div>;
    };

    const Decorated = () =>
      Decorator(Story, {
        parameters: {
          tanstackStart: {
            routeTree: rootRoute,
            initialEntries: ['/storybook'],
            context: {},
          },
        },
      } as never);

    const rendered = render(<Decorated />);
    await expect(rendered.findByText('story at /storybook')).resolves.toBeTruthy();
  });

  it('fails loudly when tanstackStart parameters are missing', () => {
    const Decorator = withTanStackStart();

    expect(() => Decorator(() => <div />, { parameters: {} } as never)).toThrow(/parameters\.tanstackStart/);
  });
});
