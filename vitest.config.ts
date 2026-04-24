import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    include: ['src/test/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__mocks__/**',
        'src/bin/**',
        'src/test/**',
      ],
      thresholds: {
        global: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: -10,
        },
      }
    },
  },
});
