import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/tapkych_olimp_test',
      JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-0000',
      JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-000',
      CORS_ORIGINS: 'http://localhost:5173',
    },
  },
});
