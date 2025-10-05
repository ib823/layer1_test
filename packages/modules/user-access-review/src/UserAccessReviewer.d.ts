/**
 * User Access Review Module
 * Detects SoD violations and manages user access reviews
 */
import { IPSConnector } from '@sap-framework/core';
import { AnalysisResult, ModuleConfig } from './types';
export declare class UserAccessReviewer {
    private ipsConnector;
    private ruleEngine;
    private config;
    constructor(ipsConnector: IPSConnector, config?: Partial<ModuleConfig>);
    /**
     * Run complete SoD analysis
     */
    analyze(): Promise<AnalysisResult>;
    private fetchUserAccess;
    private convertSoDRulesToFrameworkRules;
    private convertToSoDViolations;
    private generateAnalysisResult;
    private generateRecommendations;
    private getSoDRuleById;
    private sendNotifications;
    getStats(): {
        module: string;
        version: string;
        rulesLoaded: number;
        configuration: ModuleConfig;
    };
}
//# sourceMappingURL=UserAccessReviewer.d.ts.map