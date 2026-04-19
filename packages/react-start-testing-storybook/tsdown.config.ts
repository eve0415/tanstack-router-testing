import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  deps: {
    neverBundle: ['@storybook/react', '@tanstack/react-router', '@tanstack/react-start', 'react', 'react-dom', 'react/jsx-runtime', 'storybook'],
  },
});
