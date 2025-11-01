/**
 * Audit Logger Service
 *
 * Centralized service for capturing and logging audit events across the platform.
 * Provides automatic context enrichment, PII masking, and async storage.
 *
 * @module audit/AuditLogger
 */

import { PrismaClient } from '../generated/prisma';
import {
  AuditEventType,
  AuditEventCategory,
  getEventMetadata,
  isComplianceRelevant,
  getRetentionYears,
} from './EventTypes';
import * as piiMasking from '../utils/piiMasking';
import logger from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface AuditContext {
  tenantId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userIp?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface AuditEvent {
  eventType: AuditEventType;
  tenantId: string;

  // Actor (who)
  userId?: string;
  userName?: string;
  userEmail?: string;
  userIp?: string;
  userAgent?: string;

  // Target (what)
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;

  // Action (how)
  action: string;
  description: string;
  details?: Record<string, any>;

  // Changes (for updates)
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;

  // Result
  success?: boolean;
  errorMessage?: string;

  // Context
  sessionId?: string;
  requestId?: string;
  apiEndpoint?: string;
  apiMethod?: string;
}

export interface AuditLogRecord extends AuditEvent {
  id: string;
  eventCategory: AuditEventCategory;
  complianceRelevant: boolean;
  retentionYears: number;
  timestamp: Date;
  createdAt: Date;
}

// ============================================
// AUDIT LOGGER SERVICE
// ============================================

export class AuditLogger {
  private static instance: AuditLogger;
  private prisma: PrismaClient;
  private currentContext: Partial<AuditContext> = {};

  private constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(prisma?: PrismaClient): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger(prisma);
    }
    return AuditLogger.instance;
  }

  /**
   * Set current context (for middleware to inject request context)
   */
  public setContext(context: Partial<AuditContext>): void {
    this.currentContext = { ...this.currentContext, ...context };
  }

  /**
   * Clear current context (call at end of request)
   */
  public clearContext(): void {
    this.currentContext = {};
  }

  /**
   * Get current context
   */
  public getContext(): Partial<AuditContext> {
    return { ...this.currentContext };
  }

  /**
   * Log an audit event
   */
  public async log(event: AuditEvent): Promise<void> {
    try {
      // Get event metadata
      const metadata = getEventMetadata(event.eventType);

      // Merge with current context
      const enrichedEvent: AuditEvent = {
        ...event,
        userId: event.userId || this.currentContext.userId,
        userName: event.userName || this.currentContext.userName,
        userEmail: event.userEmail || this.currentContext.userEmail,
        userIp: event.userIp || this.currentContext.userIp,
        userAgent: event.userAgent || this.currentContext.userAgent,
        sessionId: event.sessionId || this.currentContext.sessionId,
        requestId: event.requestId || this.currentContext.requestId,
      };

      // Mask PII in details if present
      const maskedDetails = enrichedEvent.details
        ? this.maskSensitiveData(enrichedEvent.details)
        : undefined;

      const maskedBefore = enrichedEvent.changesBefore
        ? this.maskSensitiveData(enrichedEvent.changesBefore)
        : undefined;

      const maskedAfter = enrichedEvent.changesAfter
        ? this.maskSensitiveData(enrichedEvent.changesAfter)
        : undefined;

      // Create audit log record
      await this.prisma.auditLog.create({
        data: {
          tenantId: enrichedEvent.tenantId,
          eventType: enrichedEvent.eventType,
          eventCategory: metadata.category,

          // Actor
          userId: enrichedEvent.userId,
          userName: enrichedEvent.userName,
          userEmail: enrichedEvent.userEmail,
          userIp: enrichedEvent.userIp,
          userAgent: enrichedEvent.userAgent,

          // Target
          resourceType: enrichedEvent.resourceType,
          resourceId: enrichedEvent.resourceId,
          resourceName: enrichedEvent.resourceName,

          // Action
          action: enrichedEvent.action,
          description: enrichedEvent.description,
          details: maskedDetails as any,

          // Changes
          changesBefore: maskedBefore as any,
          changesAfter: maskedAfter as any,

          // Result
          success: enrichedEvent.success ?? true,
          errorMessage: enrichedEvent.errorMessage,

          // Context
          sessionId: enrichedEvent.sessionId,
          requestId: enrichedEvent.requestId,
          apiEndpoint: enrichedEvent.apiEndpoint,
          apiMethod: enrichedEvent.apiMethod,

          // Compliance
          complianceRelevant: metadata.complianceRelevant,
          retentionYears: metadata.retentionYears,
        },
      });

      // Also log to application logger for real-time monitoring
      logger.info('Audit event logged', {
        eventType: enrichedEvent.eventType,
        tenantId: enrichedEvent.tenantId,
        userId: enrichedEvent.userId,
        resourceType: enrichedEvent.resourceType,
        resourceId: enrichedEvent.resourceId,
        success: enrichedEvent.success ?? true,
      });
    } catch (error) {
      // Critical: audit logging should never fail silently
      logger.error('Failed to log audit event', {
        error,
        eventType: event.eventType,
        tenantId: event.tenantId,
      });

      // Re-throw to alert system administrators
      throw error;
    }
  }

  /**
   * Log authentication event
   */
  public async logAuth(
    tenantId: string,
    eventType: AuditEventType,
    userId?: string,
    userName?: string,
    userEmail?: string,
    success = true,
    errorMessage?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      tenantId,
      userId,
      userName,
      userEmail,
      action: eventType,
      description: getEventMetadata(eventType).description,
      resourceType: 'user',
      resourceId: userId,
      resourceName: userName,
      success,
      errorMessage,
      details,
    });
  }

  /**
   * Log data access event
   */
  public async logDataAccess(
    tenantId: string,
    eventType: AuditEventType,
    resourceType: string,
    resourceId: string,
    resourceName?: string,
    action = 'view',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      tenantId,
      resourceType,
      resourceId,
      resourceName,
      action,
      description: getEventMetadata(eventType).description,
      details,
    });
  }

  /**
   * Log data modification event
   */
  public async logDataModification(
    tenantId: string,
    eventType: AuditEventType,
    resourceType: string,
    resourceId: string,
    resourceName?: string,
    changesBefore?: Record<string, any>,
    changesAfter?: Record<string, any>,
    action = 'update',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      tenantId,
      resourceType,
      resourceId,
      resourceName,
      action,
      description: getEventMetadata(eventType).description,
      changesBefore,
      changesAfter,
      details,
    });
  }

  /**
   * Log module operation
   */
  public async logModuleOperation(
    tenantId: string,
    eventType: AuditEventType,
    moduleName: string,
    operationId?: string,
    details?: Record<string, any>,
    success = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      eventType,
      tenantId,
      resourceType: 'module_operation',
      resourceId: operationId,
      resourceName: moduleName,
      action: eventType,
      description: getEventMetadata(eventType).description,
      details,
      success,
      errorMessage,
    });
  }

  /**
   * Log configuration change
   */
  public async logConfigChange(
    tenantId: string,
    eventType: AuditEventType,
    configType: string,
    configId?: string,
    configName?: string,
    changesBefore?: Record<string, any>,
    changesAfter?: Record<string, any>,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      tenantId,
      resourceType: configType,
      resourceId: configId,
      resourceName: configName,
      action: 'configure',
      description: getEventMetadata(eventType).description,
      changesBefore,
      changesAfter,
      details,
    });
  }

  /**
   * Mask sensitive data in objects
   */
  private maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip null/undefined
      if (value === null || value === undefined) {
        masked[key] = value;
        continue;
      }

      // Recursively mask nested objects
      if (typeof value === 'object' && !Array.isArray(value)) {
        masked[key] = this.maskSensitiveData(value);
        continue;
      }

      // Mask arrays of objects
      if (Array.isArray(value)) {
        masked[key] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? this.maskSensitiveData(item)
            : item
        );
        continue;
      }

      // Mask specific sensitive fields
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key')
      ) {
        masked[key] = '***REDACTED***';
        continue;
      }

      // Mask email addresses
      if (lowerKey.includes('email') && typeof value === 'string') {
        masked[key] = piiMasking.maskEmail(value);
        continue;
      }

      // Mask phone numbers
      if (
        (lowerKey.includes('phone') || lowerKey.includes('mobile')) &&
        typeof value === 'string'
      ) {
        masked[key] = piiMasking.maskPhone(value);
        continue;
      }

      // Mask IDs (tax ID, SSN, etc.)
      if (
        (lowerKey.includes('taxid') ||
          lowerKey.includes('ssn') ||
          lowerKey.includes('nric')) &&
        typeof value === 'string'
      ) {
        masked[key] = piiMasking.maskSSN(value);
        continue;
      }

      // Keep other values as-is
      masked[key] = value;
    }

    return masked;
  }

  /**
   * Query audit logs
   */
  public async query(filters: {
    tenantId: string;
    userId?: string;
    eventType?: AuditEventType;
    eventCategory?: AuditEventCategory;
    resourceType?: string;
    resourceId?: string;
    fromDate?: Date;
    toDate?: Date;
    success?: boolean;
    complianceRelevant?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const where: any = {
      tenantId: filters.tenantId,
    };

    if (filters.userId) where.userId = filters.userId;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.eventCategory) where.eventCategory = filters.eventCategory;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.success !== undefined) where.success = filters.success;
    if (filters.complianceRelevant !== undefined)
      where.complianceRelevant = filters.complianceRelevant;

    if (filters.fromDate || filters.toDate) {
      where.timestamp = {};
      if (filters.fromDate) where.timestamp.gte = filters.fromDate;
      if (filters.toDate) where.timestamp.lte = filters.toDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs: logs as any, total };
  }

  /**
   * Get audit log by ID
   */
  public async getById(id: string, tenantId: string): Promise<AuditLogRecord | null> {
    const log = await this.prisma.auditLog.findFirst({
      where: { id, tenantId },
    });

    return log as any;
  }

  /**
   * Export audit logs (for compliance)
   */
  public async export(filters: {
    tenantId: string;
    fromDate: Date;
    toDate: Date;
    eventCategory?: AuditEventCategory;
    complianceRelevant?: boolean;
  }): Promise<AuditLogRecord[]> {
    const where: any = {
      tenantId: filters.tenantId,
      timestamp: {
        gte: filters.fromDate,
        lte: filters.toDate,
      },
    };

    if (filters.eventCategory) where.eventCategory = filters.eventCategory;
    if (filters.complianceRelevant !== undefined)
      where.complianceRelevant = filters.complianceRelevant;

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    return logs as any;
  }

  /**
   * Get audit statistics
   */
  public async getStats(tenantId: string, days = 30): Promise<{
    totalEvents: number;
    eventsByCategory: Record<string, number>;
    eventsByType: Record<string, number>;
    failedEvents: number;
    complianceEvents: number;
  }> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        timestamp: { gte: fromDate },
      },
      select: {
        eventType: true,
        eventCategory: true,
        success: true,
        complianceRelevant: true,
      },
    });

    const stats = {
      totalEvents: logs.length,
      eventsByCategory: {} as Record<string, number>,
      eventsByType: {} as Record<string, number>,
      failedEvents: 0,
      complianceEvents: 0,
    };

    for (const log of logs) {
      // Count by category
      stats.eventsByCategory[log.eventCategory] =
        (stats.eventsByCategory[log.eventCategory] || 0) + 1;

      // Count by type
      stats.eventsByType[log.eventType] =
        (stats.eventsByType[log.eventType] || 0) + 1;

      // Count failures
      if (!log.success) stats.failedEvents++;

      // Count compliance events
      if (log.complianceRelevant) stats.complianceEvents++;
    }

    return stats;
  }

  /**
   * Cleanup old logs (for retention policy enforcement)
   */
  public async cleanup(tenantId: string): Promise<number> {
    const currentDate = new Date();

    // Get all logs that might be expired
    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      select: {
        id: true,
        timestamp: true,
        retentionYears: true,
      },
    });

    const idsToDelete: string[] = [];

    for (const log of logs) {
      const retentionDate = new Date(log.timestamp);
      retentionDate.setFullYear(retentionDate.getFullYear() + log.retentionYears);

      if (currentDate > retentionDate) {
        idsToDelete.push(log.id);
      }
    }

    if (idsToDelete.length > 0) {
      await this.prisma.auditLog.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });
    }

    logger.info('Audit log cleanup completed', {
      tenantId,
      deletedCount: idsToDelete.length,
    });

    return idsToDelete.length;
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
export default auditLogger;
