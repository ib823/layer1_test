module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  // Integration test setup
  globalSetup: '<rootDir>/tests/integration/setup.ts',
  // Note: globalTeardown uses named export from same file
  // Increase timeout for Testcontainers (container startup can be slow)
  testTimeout: 120000,
  maxConcurrency: 1, // Run integration tests serially to avoid DB conflicts
};
