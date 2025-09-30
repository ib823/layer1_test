/**
 * RuleEngine tests
 */

import { RuleEngine } from '../src/rules/RuleEngine';

describe('RuleEngine', () => {
  it('should initialize', () => {
    const engine = new RuleEngine();
    expect(engine).toBeDefined();
  });

  it('should return stats', () => {
    const engine = new RuleEngine();
    const stats = engine.getStats();
    expect(stats.cachedRules).toBe(0);
    expect(stats.violationsDetected).toBe(0);
  });
});