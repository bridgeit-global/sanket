import { defineConfig } from 'vitest/config';
import { sharedVitestConfig } from './vitest.shared';

export default defineConfig({
  ...sharedVitestConfig,
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    exclude: [
      'tests/e2e/**',
      'tests/routes/**',
      'node_modules/**',
      '.next/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/db/**',
        'lib/ai/**',
        'lib/supabase/**',
        'lib/**/*.test.ts',
        'node_modules/**',
      ],
    },
  },
});
