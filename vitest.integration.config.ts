import { defineConfig } from 'vitest/config';
import { sharedVitestConfig } from './vitest.shared';

export default defineConfig({
  ...sharedVitestConfig,
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/integration.setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
