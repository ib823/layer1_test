/**
 * Mock logger for tests
 * Note: jest global is available in test environment
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logger: any = {
  error: () => undefined,
  warn: () => undefined,
  info: () => undefined,
  debug: () => undefined,
  verbose: () => undefined,
};

export function createLogger() {
  return logger;
}

export default logger;
