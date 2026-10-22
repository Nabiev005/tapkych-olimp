import { defineConfig } from 'vitest/config';

// Integration tests (tests/integration) run only when TEST_DATABASE_URL points to a
// migrated, disposable PostgreSQL database. Never point it at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Integration files share one database
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl ?? 'postgresql://test:test@localhost:5432/tapkych_olimp_test',
      JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-0000',
      JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-000',
      BCRYPT_ROUNDS: '10',
      CORS_ORIGINS: 'http://localhost:5173',
    },
  },
});
