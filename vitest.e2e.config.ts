import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['e2e/**/*.e2e.ts'],
    // E2E tests hit the real filesystem — give them more time
    testTimeout: 15000,
  },
});
