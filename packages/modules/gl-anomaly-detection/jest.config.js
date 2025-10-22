module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  // Coverage thresholds disabled
  // coverageThreshold: {
    // global: {
    //   branches: 70,
    //   functions: 70,
    //   lines: 70,
    //   statements: 70
    // }
  },
  moduleNameMapper: {
    '^@sap-framework/(.*)$': '<rootDir>/../../$1/src'
  },
  maxConcurrency: 14
};
