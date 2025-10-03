import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import { SoDViolationRepository } from '@sap-framework/core';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * SoD (Segregation of Duties) Enforcement Middleware
 * Blocks users with active HIGH-risk SoD violations from performing sensitive operations
 */

export interface SoDEnforcementOptions {
  blockHighRisk?: boolean;
  blockMediumRisk?: boolean;
  allowAcknowledged?: boolean;
  sensitiveOperations?: string[];
}

const DEFAULT_OPTIONS: SoDEnforcementOptions = {
  blockHighRisk: true,
  blockMediumRisk: false,
  allowAcknowledged: true,
  sensitiveOperations: [
    'FINANCIAL_POST',
    'PAYMENT_APPROVAL',
    'VENDOR_CREATE',
    'USER_ROLE_ASSIGN',
    'BUDGET_APPROVE',
  ],
};

/**
 * Middleware to enforce SoD policies at runtime
 * Checks if the authenticated user has active SoD violations that should block the operation
 */
export function enforceSoD(options: SoDEnforcementOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Skip SoD checks if disabled in config
    if (!config.security?.sodEnforcement?.enabled) {
      logger.debug('SoD enforcement disabled in config');
      next();
      return;
    }

    // Skip if no user authenticated
    if (!req.user) {
      logger.warn('SoD enforcement: No authenticated user');
      next();
      return;
    }

    const { tenantId, id: userId } = req.user;
    const operation = req.body?.operation || req.query?.operation || 'UNKNOWN';

    try {
      const sodRepo = new SoDViolationRepository(config.databaseUrl);

      // Get active violations for this user
      const violations = await sodRepo.getViolationsByUser(tenantId, userId);

      // Close repository connection
      await sodRepo.close();

      // Filter to only active violations
      const activeViolations = violations.filter((v: any) => v.status === 'OPEN');

      if (activeViolations.length === 0) {
        logger.debug('SoD enforcement: No active violations', { userId, tenantId });
        next();
        return;
      }

      // Check for blocking violations based on risk level
      const highRiskViolations = activeViolations.filter((v: any) => v.risk_level === 'HIGH');
      const mediumRiskViolations = activeViolations.filter((v: any) => v.risk_level === 'MEDIUM');

      // Block if high-risk violations exist and blocking is enabled
      if (opts.blockHighRisk && highRiskViolations.length > 0) {
        // Check if violations are acknowledged and we allow acknowledged violations
        const unacknowledgedHighRisk = highRiskViolations.filter((v: any) => !v.acknowledged_at);

        if (unacknowledgedHighRisk.length > 0 || !opts.allowAcknowledged) {
          logger.warn('SoD enforcement: Blocking user due to HIGH-risk violations', {
            userId,
            tenantId,
            operation,
            violations: unacknowledgedHighRisk.length,
          });

          ApiResponseUtil.forbidden(
            res,
            `Access denied: User has ${unacknowledgedHighRisk.length} unresolved HIGH-risk Segregation of Duties violations. Please contact your administrator.`
          );
          return;
        }
      }

      // Block if medium-risk violations exist and blocking is enabled
      if (opts.blockMediumRisk && mediumRiskViolations.length > 0) {
        const unacknowledgedMediumRisk = mediumRiskViolations.filter((v: any) => !v.acknowledged_at);

        if (unacknowledgedMediumRisk.length > 0 || !opts.allowAcknowledged) {
          logger.warn('SoD enforcement: Blocking user due to MEDIUM-risk violations', {
            userId,
            tenantId,
            operation,
            violations: unacknowledgedMediumRisk.length,
          });

          ApiResponseUtil.forbidden(
            res,
            `Access denied: User has ${unacknowledgedMediumRisk.length} unresolved MEDIUM-risk Segregation of Duties violations. Please contact your administrator.`
          );
          return;
        }
      }

      // Log warning but allow if only low-risk or acknowledged violations
      if (activeViolations.length > 0) {
        logger.warn('SoD enforcement: User has active violations but allowed to proceed', {
          userId,
          tenantId,
          operation,
          highRisk: highRiskViolations.length,
          mediumRisk: mediumRiskViolations.length,
          lowRisk: activeViolations.filter((v: any) => v.risk_level === 'LOW').length,
        });
      }

      next();
    } catch (error: any) {
      logger.error('SoD enforcement error:', {
        error: error.message,
        userId,
        tenantId,
        operation,
      });

      // Fail open or closed based on configuration
      if (config.security?.sodEnforcement?.failOpen) {
        logger.warn('SoD enforcement: Failing open due to error');
        next();
      } else {
        ApiResponseUtil.error(
          res,
          'SOD_ENFORCEMENT_ERROR',
          'Unable to verify Segregation of Duties compliance. Access denied.',
          503
        );
      }
    }
  };
}

/**
 * Middleware specifically for sensitive financial operations
 * More strict enforcement - blocks medium and high risk
 */
export function enforceSoDStrict() {
  return enforceSoD({
    blockHighRisk: true,
    blockMediumRisk: true,
    allowAcknowledged: false,
  });
}

/**
 * Middleware for moderate enforcement
 * Blocks only high-risk violations
 */
export function enforceSoDModerate() {
  return enforceSoD({
    blockHighRisk: true,
    blockMediumRisk: false,
    allowAcknowledged: true,
  });
}

/**
 * Check if a specific operation is sensitive based on configuration
 */
export function isSensitiveOperation(operation: string): boolean {
  const sensitiveOps = config.security?.sodEnforcement?.sensitiveOperations ||
    DEFAULT_OPTIONS.sensitiveOperations || [];
  return sensitiveOps.includes(operation);
}
