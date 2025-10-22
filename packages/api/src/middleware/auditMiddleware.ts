/**
 * Audit Middleware
 *
 * Automatically captures and logs API requests for audit trail
 *
 * @module middleware/auditMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { auditLogger, AuditEventType } from '@sap-framework/core';
import logger from '../utils/logger';

// Extend Express Request to include audit context
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Audit middleware configuration
 */
interface AuditMiddlewareConfig {
  // Skip audit logging for certain paths
  skipPaths?: RegExp[];

  // Skip GET requests (read-only operations)
  skipGetRequests?: boolean;

  // Log request body
  logRequestBody?: boolean;

  // Log response body (be careful with large responses)
  logResponseBody?: boolean;

  // Sanitize sensitive fields in logged bodies
  sanitizeFields?: string[];
}

const DEFAULT_CONFIG: AuditMiddlewareConfig = {
  skipPaths: [
    /^\/api\/health/,
    /^\/api\/metrics/,
    /^\/api\/audit\/logs/, // Don't log audit log queries
  ],
  skipGetRequests: true,
  logRequestBody: true,
  logResponseBody: false,
  sanitizeFields: [
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'clientSecret',
    'client_secret',
  ],
};

/**
 * Create audit middleware
 */
export function createAuditMiddleware(
  config: AuditMiddlewareConfig = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    // Generate unique request ID
    req.requestId = req.headers['x-request-id'] as string || uuidv4();
    req.startTime = Date.now();

    // Check if path should be skipped
    const shouldSkip = finalConfig.skipPaths?.some((pattern) =>
      pattern.test(req.path)
    );

    if (shouldSkip) {
      return next();
    }

    // Skip GET requests if configured
    if (finalConfig.skipGetRequests && req.method === 'GET') {
      return next();
    }

    // Extract user info from authenticated request
    const user = (req as any).user;
    const tenantId = user?.tenantId || req.headers['x-tenant-id'] as string || 'system';

    // Set audit context
    auditLogger.setContext({
      tenantId,
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      userIp: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      sessionId: (req as any).sessionID,
      requestId: req.requestId,
    });

    // Capture response
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body: any): Response {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log on response finish
    res.on('finish', async () => {
      try {
        const duration = Date.now() - (req.startTime || Date.now());
        const statusCode = res.statusCode;
        const success = statusCode >= 200 && statusCode < 400;

        // Determine event type based on HTTP method and path
        const eventType = determineEventType(req.method, req.path, statusCode);

        // Prepare request body (sanitized)
        const requestBody = finalConfig.logRequestBody
          ? sanitizeObject(req.body, finalConfig.sanitizeFields || [])
          : undefined;

        // Prepare response body (sanitized)
        const respBody = finalConfig.logResponseBody && responseBody
          ? sanitizeObject(
              typeof responseBody === 'string'
                ? JSON.parse(responseBody)
                : responseBody,
              finalConfig.sanitizeFields || []
            )
          : undefined;

        // Log the API request
        await auditLogger.log({
          eventType,
          tenantId,
          action: req.method,
          description: `${req.method} ${req.path}`,
          apiEndpoint: req.path,
          apiMethod: req.method,
          success,
          details: {
            query: req.query,
            params: req.params,
            body: requestBody,
            response: respBody,
            statusCode,
            duration,
          },
          errorMessage: success ? undefined : `HTTP ${statusCode} error`,
        });

        // Clear context
        auditLogger.clearContext();
      } catch (error) {
        logger.error('Failed to log audit event in middleware', { error });
        // Don't throw - audit logging should never break the app
      }
    });

    next();
  };
}

/**
 * Determine event type based on HTTP method and path
 */
function determineEventType(
  method: string,
  path: string,
  statusCode: number
): AuditEventType {
  // Authentication endpoints
  if (path.includes('/auth/login')) {
    return statusCode < 400
      ? AuditEventType.USER_LOGIN
      : AuditEventType.LOGIN_FAILED;
  }
  if (path.includes('/auth/logout')) {
    return AuditEventType.USER_LOGOUT;
  }
  if (path.includes('/auth/password')) {
    return AuditEventType.PASSWORD_CHANGED;
  }

  // Module operations
  if (path.includes('/sod/analyze')) {
    return AuditEventType.SOD_ANALYSIS_RUN;
  }
  if (path.includes('/gl-anomaly/detect')) {
    return AuditEventType.GL_ANOMALY_DETECTION_RUN;
  }
  if (path.includes('/matching/analyze')) {
    return AuditEventType.INVOICE_MATCHING_RUN;
  }

  // Configuration changes
  if (path.includes('/modules') && method === 'POST') {
    return AuditEventType.MODULE_ACTIVATED;
  }
  if (path.includes('/tenants') && method === 'POST') {
    return AuditEventType.TENANT_CREATED;
  }
  if (path.includes('/connectors') && method === 'POST') {
    return AuditEventType.CONNECTOR_CONFIGURED;
  }

  // Data access operations
  switch (method) {
    case 'GET':
      return AuditEventType.RECORD_VIEWED;
    case 'POST':
      return AuditEventType.RECORD_CREATED;
    case 'PUT':
    case 'PATCH':
      return AuditEventType.RECORD_UPDATED;
    case 'DELETE':
      return AuditEventType.RECORD_DELETED;
    default:
      return AuditEventType.RECORD_VIEWED;
  }
}

/**
 * Sanitize sensitive fields in object
 */
function sanitizeObject(
  obj: any,
  sensitiveFields: string[]
): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, sensitiveFields));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some((field) =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '***REDACTED***';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Default audit middleware instance
 */
export const auditMiddleware = createAuditMiddleware();
