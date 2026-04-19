import { clearAllMiddlewareMocks, clearAllServerFnMocks, setEnv } from '@tanstack-router-testing/router-testing-core';
import { afterEach, beforeEach, vi } from 'vitest';

setEnv('client');

Object.defineProperty(globalThis, 'scrollTo', {
  configurable: true,
  value: vi.fn<typeof globalThis.scrollTo>(),
});

Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  value: vi.fn<typeof globalThis.matchMedia>().mockImplementation(
    (query: string) =>
      ({
        addEventListener: vi.fn<(type: string, listener: EventListenerOrEventListenerObject) => void>(),
        addListener: vi.fn<(listener: EventListenerOrEventListenerObject) => void>(),
        dispatchEvent: vi.fn<(event: Event) => boolean>(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn<(type: string, listener: EventListenerOrEventListenerObject) => void>(),
        removeListener: vi.fn<(listener: EventListenerOrEventListenerObject) => void>(),
      }) as MediaQueryList,
  ),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];

  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(globalThis, 'IntersectionObserver', {
  configurable: true,
  value: IntersectionObserverMock,
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn<() => void>(),
});

const ensureAppRoot = () => {
  if (!document.getElementById('app')) {
    const app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
  }
  if (!document.getElementById('root')) {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  }
};

ensureAppRoot();

beforeEach(() => {
  ensureAppRoot();
});

afterEach(() => {
  clearAllServerFnMocks();
  clearAllMiddlewareMocks();
  setEnv('client');
});
