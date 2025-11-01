/**
 * Audit Event Types and Categories
 *
 * Comprehensive event type system for audit trail logging
 *
 * @module audit/EventTypes
 */

// ============================================
// EVENT CATEGORIES
// ============================================

export enum AuditEventCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  MODULE_OPERATION = 'module_operation',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system',
  INTEGRATION = 'integration',
  COMPLIANCE = 'compliance',
}

// ============================================
// EVENT TYPES
// ============================================

export enum AuditEventType {
  // Authentication Events
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_VERIFIED = 'MFA_VERIFIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization Events
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Data Access Events
  RECORD_VIEWED = 'RECORD_VIEWED',
  RECORD_CREATED = 'RECORD_CREATED',
  RECORD_UPDATED = 'RECORD_UPDATED',
  RECORD_DELETED = 'RECORD_DELETED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  BULK_OPERATION = 'BULK_OPERATION',

  // SoD Module Events
  SOD_ANALYSIS_RUN = 'SOD_ANALYSIS_RUN',
  SOD_VIOLATION_DETECTED = 'SOD_VIOLATION_DETECTED',
  SOD_VIOLATION_RESOLVED = 'SOD_VIOLATION_RESOLVED',
  SOD_VIOLATION_ESCALATED = 'SOD_VIOLATION_ESCALATED',
  SOD_VIOLATION_DISMISSED = 'SOD_VIOLATION_DISMISSED',
  SOD_RULE_CREATED = 'SOD_RULE_CREATED',
  SOD_RULE_UPDATED = 'SOD_RULE_UPDATED',
  SOD_RULE_DELETED = 'SOD_RULE_DELETED',

  // GL Anomaly Module Events
  GL_ANOMALY_DETECTION_RUN = 'GL_ANOMALY_DETECTION_RUN',
  GL_ANOMALY_DETECTED = 'GL_ANOMALY_DETECTED',
  GL_ANOMALY_REVIEWED = 'GL_ANOMALY_REVIEWED',
  GL_ANOMALY_RESOLVED = 'GL_ANOMALY_RESOLVED',

  // Invoice Matching Module Events
  INVOICE_MATCHING_RUN = 'INVOICE_MATCHING_RUN',
  INVOICE_MATCHED = 'INVOICE_MATCHED',
  INVOICE_MISMATCH_DETECTED = 'INVOICE_MISMATCH_DETECTED',
  FRAUD_ALERT_TRIGGERED = 'FRAUD_ALERT_TRIGGERED',
  INVOICE_APPROVED = 'INVOICE_APPROVED',
  INVOICE_REJECTED = 'INVOICE_REJECTED',

  // Vendor Module Events
  VENDOR_QUALITY_ANALYSIS = 'VENDOR_QUALITY_ANALYSIS',
  VENDOR_FLAGGED = 'VENDOR_FLAGGED',
  VENDOR_DUPLICATE_DETECTED = 'VENDOR_DUPLICATE_DETECTED',
  VENDOR_PROFILE_UPDATED = 'VENDOR_PROFILE_UPDATED',

  // User Access Review Events
  ACCESS_REVIEW_STARTED = 'ACCESS_REVIEW_STARTED',
  ACCESS_REVIEW_COMPLETED = 'ACCESS_REVIEW_COMPLETED',
  ACCESS_CERTIFIED = 'ACCESS_CERTIFIED',
  ACCESS_REVOKED = 'ACCESS_REVOKED',

  // LHDN e-Invoice Events
  EINVOICE_CREATED = 'EINVOICE_CREATED',
  EINVOICE_VALIDATED = 'EINVOICE_VALIDATED',
  EINVOICE_SUBMITTED = 'EINVOICE_SUBMITTED',
  EINVOICE_ACCEPTED = 'EINVOICE_ACCEPTED',
  EINVOICE_REJECTED = 'EINVOICE_REJECTED',
  EINVOICE_CANCELLED = 'EINVOICE_CANCELLED',

  // Configuration Events
  CONFIG_CHANGED = 'CONFIG_CHANGED',
  MODULE_ACTIVATED = 'MODULE_ACTIVATED',
  MODULE_DEACTIVATED = 'MODULE_DEACTIVATED',
  MODULE_CONFIGURED = 'MODULE_CONFIGURED',
  CONNECTOR_CONFIGURED = 'CONNECTOR_CONFIGURED',
  CONNECTOR_TEST_SUCCESS = 'CONNECTOR_TEST_SUCCESS',
  CONNECTOR_TEST_FAILED = 'CONNECTOR_TEST_FAILED',
  TENANT_CREATED = 'TENANT_CREATED',
  TENANT_UPDATED = 'TENANT_UPDATED',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
  TENANT_ACTIVATED = 'TENANT_ACTIVATED',

  // System Events
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
  SCHEDULED_JOB_RUN = 'SCHEDULED_JOB_RUN',
  SCHEDULED_JOB_FAILED = 'SCHEDULED_JOB_FAILED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  SYSTEM_HEALTH_CHECK = 'SYSTEM_HEALTH_CHECK',
  SYSTEM_ERROR = 'SYSTEM_ERROR',

  // Integration Events
  INTEGRATION_CONFIGURED = 'INTEGRATION_CONFIGURED',
  WEBHOOK_TRIGGERED = 'WEBHOOK_TRIGGERED',
  SLACK_NOTIFICATION_SENT = 'SLACK_NOTIFICATION_SENT',
  EMAIL_SENT = 'EMAIL_SENT',
  SERVICENOW_TICKET_CREATED = 'SERVICENOW_TICKET_CREATED',

  // Automation Events
  AUTOMATION_CREATED = 'AUTOMATION_CREATED',
  AUTOMATION_UPDATED = 'AUTOMATION_UPDATED',
  AUTOMATION_DELETED = 'AUTOMATION_DELETED',
  AUTOMATION_TRIGGERED = 'AUTOMATION_TRIGGERED',
  AUTOMATION_EXECUTED = 'AUTOMATION_EXECUTED',
  AUTOMATION_FAILED = 'AUTOMATION_FAILED',
}

// ============================================
// EVENT METADATA
// ============================================

export interface AuditEventMetadata {
  eventType: AuditEventType;
  category: AuditEventCategory;
  complianceRelevant: boolean;
  retentionYears: number;
  description: string;
}

// Map of event types to their metadata
export const EVENT_METADATA: Record<AuditEventType, AuditEventMetadata> = {
  // Authentication
  [AuditEventType.USER_LOGIN]: {
    eventType: AuditEventType.USER_LOGIN,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'User successfully logged in',
  },
  [AuditEventType.USER_LOGOUT]: {
    eventType: AuditEventType.USER_LOGOUT,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'User logged out',
  },
  [AuditEventType.LOGIN_FAILED]: {
    eventType: AuditEventType.LOGIN_FAILED,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Failed login attempt',
  },
  [AuditEventType.PASSWORD_CHANGED]: {
    eventType: AuditEventType.PASSWORD_CHANGED,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'User password changed',
  },
  [AuditEventType.PASSWORD_RESET_REQUESTED]: {
    eventType: AuditEventType.PASSWORD_RESET_REQUESTED,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Password reset requested',
  },
  [AuditEventType.PASSWORD_RESET_COMPLETED]: {
    eventType: AuditEventType.PASSWORD_RESET_COMPLETED,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Password reset completed',
  },
  [AuditEventType.MFA_ENABLED]: {
    eventType: AuditEventType.MFA_ENABLED,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Multi-factor authentication enabled',
  },
  [AuditEventType.MFA_DISABLED]: {
    eventType: AuditEventType.MFA_DISABLED,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Multi-factor authentication disabled',
  },
  [AuditEventType.MFA_VERIFIED]: {
    eventType: AuditEventType.MFA_VERIFIED,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'MFA verification successful',
  },
  [AuditEventType.SESSION_EXPIRED]: {
    eventType: AuditEventType.SESSION_EXPIRED,
    category: AuditEventCategory.AUTHENTICATION,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'User session expired',
  },

  // Authorization
  [AuditEventType.PERMISSION_GRANTED]: {
    eventType: AuditEventType.PERMISSION_GRANTED,
    category: AuditEventCategory.AUTHORIZATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Permission granted to user',
  },
  [AuditEventType.PERMISSION_REVOKED]: {
    eventType: AuditEventType.PERMISSION_REVOKED,
    category: AuditEventCategory.AUTHORIZATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Permission revoked from user',
  },
  [AuditEventType.ROLE_ASSIGNED]: {
    eventType: AuditEventType.ROLE_ASSIGNED,
    category: AuditEventCategory.AUTHORIZATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Role assigned to user',
  },
  [AuditEventType.ROLE_REMOVED]: {
    eventType: AuditEventType.ROLE_REMOVED,
    category: AuditEventCategory.AUTHORIZATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Role removed from user',
  },
  [AuditEventType.ACCESS_DENIED]: {
    eventType: AuditEventType.ACCESS_DENIED,
    category: AuditEventCategory.AUTHORIZATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Access denied to resource',
  },

  // Data Access
  [AuditEventType.RECORD_VIEWED]: {
    eventType: AuditEventType.RECORD_VIEWED,
    category: AuditEventCategory.DATA_ACCESS,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'Record viewed',
  },
  [AuditEventType.RECORD_CREATED]: {
    eventType: AuditEventType.RECORD_CREATED,
    category: AuditEventCategory.DATA_ACCESS,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'New record created',
  },
  [AuditEventType.RECORD_UPDATED]: {
    eventType: AuditEventType.RECORD_UPDATED,
    category: AuditEventCategory.DATA_ACCESS,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Record updated',
  },
  [AuditEventType.RECORD_DELETED]: {
    eventType: AuditEventType.RECORD_DELETED,
    category: AuditEventCategory.DATA_ACCESS,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'Record deleted',
  },
  [AuditEventType.DATA_EXPORTED]: {
    eventType: AuditEventType.DATA_EXPORTED,
    category: AuditEventCategory.DATA_ACCESS,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Data exported',
  },
  [AuditEventType.REPORT_GENERATED]: {
    eventType: AuditEventType.REPORT_GENERATED,
    category: AuditEventCategory.DATA_ACCESS,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Report generated',
  },
  [AuditEventType.BULK_OPERATION]: {
    eventType: AuditEventType.BULK_OPERATION,
    category: AuditEventCategory.DATA_ACCESS,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Bulk operation performed',
  },

  // SoD Module
  [AuditEventType.SOD_ANALYSIS_RUN]: {
    eventType: AuditEventType.SOD_ANALYSIS_RUN,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'SoD analysis executed',
  },
  [AuditEventType.SOD_VIOLATION_DETECTED]: {
    eventType: AuditEventType.SOD_VIOLATION_DETECTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'SoD violation detected',
  },
  [AuditEventType.SOD_VIOLATION_RESOLVED]: {
    eventType: AuditEventType.SOD_VIOLATION_RESOLVED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'SoD violation resolved',
  },
  [AuditEventType.SOD_VIOLATION_ESCALATED]: {
    eventType: AuditEventType.SOD_VIOLATION_ESCALATED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'SoD violation escalated',
  },
  [AuditEventType.SOD_VIOLATION_DISMISSED]: {
    eventType: AuditEventType.SOD_VIOLATION_DISMISSED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'SoD violation dismissed',
  },
  [AuditEventType.SOD_RULE_CREATED]: {
    eventType: AuditEventType.SOD_RULE_CREATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'SoD rule created',
  },
  [AuditEventType.SOD_RULE_UPDATED]: {
    eventType: AuditEventType.SOD_RULE_UPDATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'SoD rule updated',
  },
  [AuditEventType.SOD_RULE_DELETED]: {
    eventType: AuditEventType.SOD_RULE_DELETED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'SoD rule deleted',
  },

  // GL Anomaly
  [AuditEventType.GL_ANOMALY_DETECTION_RUN]: {
    eventType: AuditEventType.GL_ANOMALY_DETECTION_RUN,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'GL anomaly detection executed',
  },
  [AuditEventType.GL_ANOMALY_DETECTED]: {
    eventType: AuditEventType.GL_ANOMALY_DETECTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'GL anomaly detected',
  },
  [AuditEventType.GL_ANOMALY_REVIEWED]: {
    eventType: AuditEventType.GL_ANOMALY_REVIEWED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'GL anomaly reviewed',
  },
  [AuditEventType.GL_ANOMALY_RESOLVED]: {
    eventType: AuditEventType.GL_ANOMALY_RESOLVED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'GL anomaly resolved',
  },

  // Invoice Matching
  [AuditEventType.INVOICE_MATCHING_RUN]: {
    eventType: AuditEventType.INVOICE_MATCHING_RUN,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Invoice matching analysis executed',
  },
  [AuditEventType.INVOICE_MATCHED]: {
    eventType: AuditEventType.INVOICE_MATCHED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Invoice matched successfully',
  },
  [AuditEventType.INVOICE_MISMATCH_DETECTED]: {
    eventType: AuditEventType.INVOICE_MISMATCH_DETECTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'Invoice mismatch detected',
  },
  [AuditEventType.FRAUD_ALERT_TRIGGERED]: {
    eventType: AuditEventType.FRAUD_ALERT_TRIGGERED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'Fraud alert triggered',
  },
  [AuditEventType.INVOICE_APPROVED]: {
    eventType: AuditEventType.INVOICE_APPROVED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Invoice approved for payment',
  },
  [AuditEventType.INVOICE_REJECTED]: {
    eventType: AuditEventType.INVOICE_REJECTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Invoice rejected',
  },

  // Vendor
  [AuditEventType.VENDOR_QUALITY_ANALYSIS]: {
    eventType: AuditEventType.VENDOR_QUALITY_ANALYSIS,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: false,
    retentionYears: 3,
    description: 'Vendor quality analysis executed',
  },
  [AuditEventType.VENDOR_FLAGGED]: {
    eventType: AuditEventType.VENDOR_FLAGGED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Vendor flagged for review',
  },
  [AuditEventType.VENDOR_DUPLICATE_DETECTED]: {
    eventType: AuditEventType.VENDOR_DUPLICATE_DETECTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: false,
    retentionYears: 3,
    description: 'Duplicate vendor detected',
  },
  [AuditEventType.VENDOR_PROFILE_UPDATED]: {
    eventType: AuditEventType.VENDOR_PROFILE_UPDATED,
    category: AuditEventCategory.DATA_ACCESS,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Vendor profile updated',
  },

  // User Access Review
  [AuditEventType.ACCESS_REVIEW_STARTED]: {
    eventType: AuditEventType.ACCESS_REVIEW_STARTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Access review started',
  },
  [AuditEventType.ACCESS_REVIEW_COMPLETED]: {
    eventType: AuditEventType.ACCESS_REVIEW_COMPLETED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Access review completed',
  },
  [AuditEventType.ACCESS_CERTIFIED]: {
    eventType: AuditEventType.ACCESS_CERTIFIED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'User access certified',
  },
  [AuditEventType.ACCESS_REVOKED]: {
    eventType: AuditEventType.ACCESS_REVOKED,
    category: AuditEventCategory.AUTHORIZATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'User access revoked',
  },

  // LHDN e-Invoice
  [AuditEventType.EINVOICE_CREATED]: {
    eventType: AuditEventType.EINVOICE_CREATED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'E-invoice created',
  },
  [AuditEventType.EINVOICE_VALIDATED]: {
    eventType: AuditEventType.EINVOICE_VALIDATED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'E-invoice validated',
  },
  [AuditEventType.EINVOICE_SUBMITTED]: {
    eventType: AuditEventType.EINVOICE_SUBMITTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'E-invoice submitted to LHDN',
  },
  [AuditEventType.EINVOICE_ACCEPTED]: {
    eventType: AuditEventType.EINVOICE_ACCEPTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'E-invoice accepted by LHDN',
  },
  [AuditEventType.EINVOICE_REJECTED]: {
    eventType: AuditEventType.EINVOICE_REJECTED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'E-invoice rejected by LHDN',
  },
  [AuditEventType.EINVOICE_CANCELLED]: {
    eventType: AuditEventType.EINVOICE_CANCELLED,
    category: AuditEventCategory.MODULE_OPERATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'E-invoice cancelled',
  },

  // Configuration
  [AuditEventType.CONFIG_CHANGED]: {
    eventType: AuditEventType.CONFIG_CHANGED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Configuration changed',
  },
  [AuditEventType.MODULE_ACTIVATED]: {
    eventType: AuditEventType.MODULE_ACTIVATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Module activated',
  },
  [AuditEventType.MODULE_DEACTIVATED]: {
    eventType: AuditEventType.MODULE_DEACTIVATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Module deactivated',
  },
  [AuditEventType.MODULE_CONFIGURED]: {
    eventType: AuditEventType.MODULE_CONFIGURED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Module configured',
  },
  [AuditEventType.CONNECTOR_CONFIGURED]: {
    eventType: AuditEventType.CONNECTOR_CONFIGURED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'ERP connector configured',
  },
  [AuditEventType.CONNECTOR_TEST_SUCCESS]: {
    eventType: AuditEventType.CONNECTOR_TEST_SUCCESS,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'Connector test successful',
  },
  [AuditEventType.CONNECTOR_TEST_FAILED]: {
    eventType: AuditEventType.CONNECTOR_TEST_FAILED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 3,
    description: 'Connector test failed',
  },
  [AuditEventType.TENANT_CREATED]: {
    eventType: AuditEventType.TENANT_CREATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'Tenant created',
  },
  [AuditEventType.TENANT_UPDATED]: {
    eventType: AuditEventType.TENANT_UPDATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Tenant updated',
  },
  [AuditEventType.TENANT_SUSPENDED]: {
    eventType: AuditEventType.TENANT_SUSPENDED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'Tenant suspended',
  },
  [AuditEventType.TENANT_ACTIVATED]: {
    eventType: AuditEventType.TENANT_ACTIVATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Tenant activated',
  },

  // System
  [AuditEventType.BACKUP_CREATED]: {
    eventType: AuditEventType.BACKUP_CREATED,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Backup created',
  },
  [AuditEventType.BACKUP_RESTORED]: {
    eventType: AuditEventType.BACKUP_RESTORED,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: true,
    retentionYears: 10,
    description: 'Backup restored',
  },
  [AuditEventType.SCHEDULED_JOB_RUN]: {
    eventType: AuditEventType.SCHEDULED_JOB_RUN,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'Scheduled job executed',
  },
  [AuditEventType.SCHEDULED_JOB_FAILED]: {
    eventType: AuditEventType.SCHEDULED_JOB_FAILED,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: true,
    retentionYears: 3,
    description: 'Scheduled job failed',
  },
  [AuditEventType.API_KEY_CREATED]: {
    eventType: AuditEventType.API_KEY_CREATED,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'API key created',
  },
  [AuditEventType.API_KEY_REVOKED]: {
    eventType: AuditEventType.API_KEY_REVOKED,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'API key revoked',
  },
  [AuditEventType.SYSTEM_HEALTH_CHECK]: {
    eventType: AuditEventType.SYSTEM_HEALTH_CHECK,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'System health check performed',
  },
  [AuditEventType.SYSTEM_ERROR]: {
    eventType: AuditEventType.SYSTEM_ERROR,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: true,
    retentionYears: 3,
    description: 'System error occurred',
  },

  // Integration
  [AuditEventType.INTEGRATION_CONFIGURED]: {
    eventType: AuditEventType.INTEGRATION_CONFIGURED,
    category: AuditEventCategory.INTEGRATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Integration configured',
  },
  [AuditEventType.WEBHOOK_TRIGGERED]: {
    eventType: AuditEventType.WEBHOOK_TRIGGERED,
    category: AuditEventCategory.INTEGRATION,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'Webhook triggered',
  },
  [AuditEventType.SLACK_NOTIFICATION_SENT]: {
    eventType: AuditEventType.SLACK_NOTIFICATION_SENT,
    category: AuditEventCategory.INTEGRATION,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'Slack notification sent',
  },
  [AuditEventType.EMAIL_SENT]: {
    eventType: AuditEventType.EMAIL_SENT,
    category: AuditEventCategory.INTEGRATION,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'Email sent',
  },
  [AuditEventType.SERVICENOW_TICKET_CREATED]: {
    eventType: AuditEventType.SERVICENOW_TICKET_CREATED,
    category: AuditEventCategory.INTEGRATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'ServiceNow ticket created',
  },

  // Automation
  [AuditEventType.AUTOMATION_CREATED]: {
    eventType: AuditEventType.AUTOMATION_CREATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Automation rule created',
  },
  [AuditEventType.AUTOMATION_UPDATED]: {
    eventType: AuditEventType.AUTOMATION_UPDATED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Automation rule updated',
  },
  [AuditEventType.AUTOMATION_DELETED]: {
    eventType: AuditEventType.AUTOMATION_DELETED,
    category: AuditEventCategory.CONFIGURATION,
    complianceRelevant: true,
    retentionYears: 7,
    description: 'Automation rule deleted',
  },
  [AuditEventType.AUTOMATION_TRIGGERED]: {
    eventType: AuditEventType.AUTOMATION_TRIGGERED,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: false,
    retentionYears: 1,
    description: 'Automation triggered',
  },
  [AuditEventType.AUTOMATION_EXECUTED]: {
    eventType: AuditEventType.AUTOMATION_EXECUTED,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: true,
    retentionYears: 3,
    description: 'Automation executed successfully',
  },
  [AuditEventType.AUTOMATION_FAILED]: {
    eventType: AuditEventType.AUTOMATION_FAILED,
    category: AuditEventCategory.SYSTEM,
    complianceRelevant: true,
    retentionYears: 3,
    description: 'Automation execution failed',
  },
};

/**
 * Get metadata for an event type
 */
export function getEventMetadata(eventType: AuditEventType): AuditEventMetadata {
  return EVENT_METADATA[eventType];
}

/**
 * Check if an event type is compliance-relevant
 */
export function isComplianceRelevant(eventType: AuditEventType): boolean {
  return EVENT_METADATA[eventType]?.complianceRelevant || false;
}

/**
 * Get retention years for an event type
 */
export function getRetentionYears(eventType: AuditEventType): number {
  return EVENT_METADATA[eventType]?.retentionYears || 7;
}
