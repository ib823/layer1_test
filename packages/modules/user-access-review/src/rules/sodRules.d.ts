/**
 * Standard Segregation of Duties Rules
 */
import { SoDRuleDefinition } from '../types';
export declare const STANDARD_SOD_RULES: SoDRuleDefinition[];
export declare function getRulesByCategory(category: SoDRuleDefinition['category']): SoDRuleDefinition[];
export declare function getRulesByRiskLevel(riskLevel: SoDRuleDefinition['riskLevel']): SoDRuleDefinition[];
export declare function getCriticalRules(): SoDRuleDefinition[];
//# sourceMappingURL=sodRules.d.ts.map