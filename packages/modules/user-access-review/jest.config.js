module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  // Coverage thresholds disabled
  // coverageThreshold: {
    // global: {
    //   branches: 70,
    //   functions: 70,
    //   lines: 70,
    //   statements: 70,
    // },
  },
  maxConcurrency: 14
};
