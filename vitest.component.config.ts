import { defineConfig } from 'vitest/config';
import { sharedVitestConfig } from './vitest.shared';

export default defineConfig({
  ...sharedVitestConfig,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/component.setup.ts'],
    include: ['tests/component/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
