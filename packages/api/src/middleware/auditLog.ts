import { Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AuthenticatedRequest } from '../types';
import { config } from '../config';
import { maskObject } from '@sap-framework/core';
import logger from '../utils/logger';

/**
 * Audit Log Middleware
 * Logs all API requests for compliance and security auditing
 */

export interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  method: string;
  path: string;
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  statusCode?: number;
  requestBody?: any;
  responseBody?: any;
  metadata?: any;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

/**
 * Actions that should be audited (for reference)
 */
// const AUDITED_ACTIONS = [
//   'CREATE',
//   'UPDATE',
//   'DELETE',
//   'READ',
//   'LOGIN',
//   'LOGOUT',
//   'ACCESS_DENIED',
//   'ROLE_ASSIGNMENT',
//   'PERMISSION_CHANGE',
//   'DATA_EXPORT',
//   'SENSITIVE_DATA_ACCESS',
//   'CONFIGURATION_CHANGE',
//   'USER_IMPERSONATION',
// ];

/**
 * Sensitive endpoints that should always be audited
 */
const SENSITIVE_ENDPOINTS = [
  '/api/auth',
  '/api/users',
  '/api/roles',
  '/api/tenants',
  '/api/sod',
  '/api/compliance',
  '/api/gdpr',
];

/**
 * Audit Log Repository
 */
export class AuditLogRepository {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10 });
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (
          tenant_id, user_id, user_email, action, resource_type,
          resource_id, method, path, ip_address, user_agent,
          request_id, status_code, request_body, response_body,
          metadata, severity
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
      `;

      // Mask PII in request and response bodies
      const maskedRequestBody = entry.requestBody ? maskObject(entry.requestBody) : null;
      const maskedResponseBody = entry.responseBody ? maskObject(entry.responseBody) : null;

      await this.pool.query(query, [
        entry.tenantId || null,
        entry.userId || null,
        entry.userEmail || null,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        entry.method,
        entry.path,
        entry.ipAddress,
        entry.userAgent || null,
        entry.requestId || null,
        entry.statusCode || null,
        maskedRequestBody ? JSON.stringify(maskedRequestBody) : null,
        maskedResponseBody ? JSON.stringify(maskedResponseBody) : null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.severity || 'INFO',
      ]);
    } catch (error: any) {
      // Don't fail the request if audit logging fails
      logger.error('Failed to write audit log:', error);
    }
  }

  async getLogs(
    tenantId: string,
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      dateFrom?: Date;
      dateTo?: Date;
      severity?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ logs: any[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(filters.userId);
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(filters.resourceType);
    }

    if (filters.dateFrom) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filters.dateTo);
    }

    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(filters.severity);
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countQuery = `SELECT COUNT(*) FROM audit_logs WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get logs
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT * FROM audit_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await this.pool.query(query, [...params, pageSize, offset]);

    return {
      logs: result.rows,
      total,
    };
  }

  /**
   * Delete old audit logs based on retention policy
   */
  async cleanup(tenantId: string, retentionDays: number): Promise<number> {
    const query = `
      DELETE FROM audit_logs
      WHERE tenant_id = $1
        AND timestamp < NOW() - INTERVAL '${retentionDays} days'
    `;

    const result = await this.pool.query(query, [tenantId]);
    return result.rowCount || 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Singleton audit log repository
 */
let auditLogRepo: AuditLogRepository | null = null;

function getAuditLogRepo(): AuditLogRepository {
  if (!auditLogRepo) {
    auditLogRepo = new AuditLogRepository(config.databaseUrl);
  }
  return auditLogRepo;
}

/**
 * Determine resource type from request path
 */
function getResourceType(path: string): string {
  const parts = path.split('/').filter(Boolean);

  if (parts.length < 2) return 'UNKNOWN';

  // parts[0] is 'api', parts[1] is the resource
  const resource = parts[1].toUpperCase();

  return resource || 'UNKNOWN';
}

/**
 * Determine action from HTTP method and path
 */
function getAction(method: string, path: string): string {
  const normalizedPath = path.toLowerCase();

  if (normalizedPath.includes('/login')) return 'LOGIN';
  if (normalizedPath.includes('/logout')) return 'LOGOUT';
  if (normalizedPath.includes('/export')) return 'DATA_EXPORT';

  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return 'READ';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Check if endpoint should be audited
 */
function shouldAudit(path: string, method: string): boolean {
  // Skip health checks and metrics
  if (path.includes('/health') || path.includes('/metrics') || path.includes('/api-docs')) {
    return false;
  }

  // Always audit sensitive endpoints
  if (SENSITIVE_ENDPOINTS.some((endpoint) => path.startsWith(endpoint))) {
    return true;
  }

  // Audit all modifications
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  return false;
}

/**
 * Get severity level based on status code and action
 */
function getSeverity(statusCode: number, action: string): 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' {
  if (statusCode >= 500) return 'CRITICAL';
  if (statusCode >= 400) return 'ERROR';
  if (action === 'DELETE' || action === 'DATA_EXPORT') return 'WARNING';
  return 'INFO';
}

/**
 * Audit logging middleware
 */
export function auditLog() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Skip if audit logging is disabled
    if (!config.security?.auditLog?.enabled) {
      next();
      return;
    }

    // Skip if not an auditable endpoint
    if (!shouldAudit(req.path, req.method)) {
      next();
      return;
    }

    // Capture request details
    const startTime = Date.now();
    const requestBody = req.body ? { ...req.body } : null;

    // Capture response
    const originalSend = res.send;
    let responseBody: any = null;

    res.send = function (data: any): Response {
      responseBody = data;
      return originalSend.call(this, data);
    };

    // Continue with request
    res.on('finish', async () => {
      try {
        const action = getAction(req.method, req.path);
        const resourceType = getResourceType(req.path);
        const resourceId = req.params?.id || req.params?.tenantId || req.params?.violationId;

        const auditEntry: AuditLogEntry = {
          tenantId: req.user?.tenantId,
          userId: req.user?.id,
          userEmail: req.user?.email,
          action,
          resourceType,
          resourceId,
          method: req.method,
          path: req.path,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent'),
          requestId: res.locals.requestId,
          statusCode: res.statusCode,
          requestBody,
          responseBody: typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody,
          metadata: {
            duration: Date.now() - startTime,
            query: req.query,
          },
          severity: getSeverity(res.statusCode, action),
        };

        const repo = getAuditLogRepo();
        await repo.log(auditEntry);
      } catch (error: any) {
        logger.error('Audit log middleware error:', error);
      }
    });

    next();
  };
}

/**
 * Manual audit log function for custom events
 */
export async function logAuditEvent(event: AuditLogEntry): Promise<void> {
  if (!config.security?.auditLog?.enabled) {
    return;
  }

  try {
    const repo = getAuditLogRepo();
    await repo.log(event);
  } catch (error: any) {
    logger.error('Failed to log audit event:', error);
  }
}
