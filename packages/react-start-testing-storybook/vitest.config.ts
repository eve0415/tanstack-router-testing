import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.?(c|m)[jt]s?(x)', 'tests/**/*.test.?(c|m)[jt]s?(x)'],
  },
});
