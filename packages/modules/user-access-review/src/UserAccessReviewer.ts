/**
 * User Access Review Module
 * Detects SoD violations and manages user access reviews
 */

import { IPSConnector } from '@sap-framework/core';
import { RuleEngine, Rule } from '@sap-framework/services';
import { STANDARD_SOD_RULES, getCriticalRules } from './rules/sodRules';
import {
  UserAccess,
  SoDViolation,
  AnalysisResult,
  SoDRuleDefinition,
  ModuleConfig
} from './types';

export class UserAccessReviewer {
  private ipsConnector: IPSConnector;
  private ruleEngine: RuleEngine;
  private config: ModuleConfig;

  constructor(
    ipsConnector: IPSConnector,
    config: Partial<ModuleConfig> = {}
  ) {
    this.ipsConnector = ipsConnector;
    this.ruleEngine = new RuleEngine();
    
    this.config = {
      dataSource: {
        type: 'IPS',
        userIdField: 'userId',
        roleField: 'roles',
        ...config.dataSource
      },
      analysis: {
        includeInactiveUsers: false,
        minimumRiskScore: 0,
        customRules: [],
        ...config.analysis
      },
      notifications: {
        enabled: true,
        recipients: [],
        onlyForCritical: true,
        ...config.notifications
      }
    };
  }

  /**
   * Run complete SoD analysis
   */
  async analyze(): Promise<AnalysisResult> {
    console.log('Starting user access review...');

    const users = await this.fetchUserAccess();
    console.log(`Fetched ${users.length} users`);

    const rules = this.convertSoDRulesToFrameworkRules();
    console.log(`Loaded ${rules.length} SoD rules`);

    const frameworkViolations = await this.ruleEngine.evaluate(users, rules);
    console.log(`Detected ${frameworkViolations.length} violations`);

    const violations = this.convertToSoDViolations(frameworkViolations);
    const result = this.generateAnalysisResult(users, violations);

    if (this.config.notifications.enabled) {
      await this.sendNotifications(result);
    }

    console.log('Analysis complete');
    return result;
  }

  private async fetchUserAccess(): Promise<UserAccess[]> {
    // Fetch users with groups included to avoid N+1 queries
    const ipsUsers = await this.ipsConnector.getUsers({
      attributes: ['id', 'userName', 'emails', 'active', 'groups'],
      count: 1000,
    });

    const users: UserAccess[] = [];

    // Process in batches of 50 to avoid overwhelming the API
    const BATCH_SIZE = 50;
    const usersToProcess = ipsUsers.filter(
      user => this.config.analysis.includeInactiveUsers || user.active
    );

    for (let i = 0; i < usersToProcess.length; i += BATCH_SIZE) {
      const batch = usersToProcess.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (ipsUser) => {
          // If groups are already included, use them; otherwise fetch
          const groups = ipsUser.groups && ipsUser.groups.length > 0
            ? ipsUser.groups
            : await this.ipsConnector.getUserGroupMemberships(ipsUser.id);

          return {
            userId: ipsUser.id,
            userName: ipsUser.userName,
            email: ipsUser.emails?.[0]?.value,
            roles: Array.isArray(groups)
              ? groups.map((g: any) => g.displayName || g)
              : [],
            isActive: ipsUser.active,
          };
        })
      );

      users.push(...batchResults);
    }

    return users;
  }

  private convertSoDRulesToFrameworkRules(): Rule[] {
    const sodRules = [
      ...STANDARD_SOD_RULES,
      ...(this.config.analysis.customRules || [])
    ];

    const filteredRules = sodRules.filter(
      rule => rule.riskScore >= this.config.analysis.minimumRiskScore
    );

    return filteredRules.map(sodRule => ({
      id: sodRule.id,
      name: sodRule.name,
      description: sodRule.description,
      pattern: {
        type: 'SOD' as const,
        definition: {
          conflictingRoles: sodRule.conflictingRoles,
          requiresAll: sodRule.requiresAll,
          userIdField: this.config.dataSource.userIdField,
          rolesField: this.config.dataSource.roleField,
        }
      },
      risk: {
        level: sodRule.riskLevel,
        score: sodRule.riskScore,
      },
      metadata: {
        category: sodRule.category,
        regulatoryReference: sodRule.regulatoryReference,
        mitigationStrategies: sodRule.mitigationStrategies,
      } as any
    }));
  }

  private convertToSoDViolations(frameworkViolations: any[]): SoDViolation[] {
    return frameworkViolations.map(violation => {
      const sodRule = this.getSoDRuleById(violation.rule.id);
      
      return {
        id: violation.id,
        userId: violation.data.userId,
        userName: violation.data.user?.userName || violation.data.userId,
        conflictingRoles: violation.data.conflictingRoles,
        riskLevel: violation.risk.level,
        riskScore: violation.risk.score,
        ruleName: violation.rule.name,
        ruleDescription: violation.rule.description || '',
        detectedAt: new Date(violation.timestamp),
        status: 'DETECTED',
        mitigationActions: sodRule?.mitigationStrategies || [],
      };
    });
  }

  private generateAnalysisResult(
    users: UserAccess[],
    violations: SoDViolation[]
  ): AnalysisResult {
    const usersWithViolations = new Set(violations.map(v => v.userId));

    const summary = {
      totalUsers: users.length,
      usersWithViolations: usersWithViolations.size,
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => v.riskLevel === 'CRITICAL').length,
      highViolations: violations.filter(v => v.riskLevel === 'HIGH').length,
      mediumViolations: violations.filter(v => v.riskLevel === 'MEDIUM').length,
      lowViolations: violations.filter(v => v.riskLevel === 'LOW').length,
    };

    const recommendations = this.generateRecommendations(summary, violations);

    return {
      summary,
      violations,
      recommendations,
      generatedAt: new Date(),
    };
  }

  private generateRecommendations(
    summary: AnalysisResult['summary'],
    violations: SoDViolation[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary.criticalViolations > 0) {
      recommendations.push(
        `🔴 CRITICAL: ${summary.criticalViolations} critical violations detected. Immediate remediation required.`
      );
    }

    if (summary.highViolations > 10) {
      recommendations.push(
        `⚠️  HIGH: ${summary.highViolations} high-risk violations found. Implement mitigation controls.`
      );
    }

    const violationRate = (summary.usersWithViolations / summary.totalUsers) * 100;
    if (violationRate > 10) {
      recommendations.push(
        `${violationRate.toFixed(1)}% of users have SoD violations. Consider role redesign.`
      );
    }

    return recommendations;
  }

  private getSoDRuleById(ruleId: string): SoDRuleDefinition | undefined {
    return [...STANDARD_SOD_RULES, ...(this.config.analysis.customRules || [])]
      .find(rule => rule.id === ruleId);
  }

  private async sendNotifications(result: AnalysisResult): Promise<void> {
    if (this.config.notifications.onlyForCritical && result.summary.criticalViolations === 0) {
      return;
    }

    console.log('📧 Sending notifications to:', this.config.notifications.recipients);
    console.log(`   - Total violations: ${result.summary.totalViolations}`);
    console.log(`   - Critical: ${result.summary.criticalViolations}`);
  }

  getStats() {
    return {
      module: 'User Access Review',
      version: '1.0.0',
      rulesLoaded: STANDARD_SOD_RULES.length + (this.config.analysis.customRules?.length || 0),
      configuration: this.config,
    };
  }
}