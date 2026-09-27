import { defineConfig } from 'vitest/config';
import { sharedVitestConfig } from './vitest.shared';

export default defineConfig({
  ...sharedVitestConfig,
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/api.setup.ts'],
    include: ['tests/api/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
