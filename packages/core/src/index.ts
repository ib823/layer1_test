/**
 * SAP MVP Framework - Core Layer (Layer 1)
 */

// Connectors
export * from './connectors';

// Normalizers (Multi-ERP data transformation)
export * from './normalizers/ERPDataNormalizer';

// Authentication
export * from './auth';

// Events
export * from './events';

// Errors (includes FrameworkError class)
export * from './errors';

// Cache
export * from './cache';

// Config
export * from './config';

// Utils
export * from './utils';
export * from './utils/piiMasking';
export * from './utils/dbEncryptionValidator';
export * from './utils/securityValidation';
// ✅ SECURITY FIX: Export new security utilities
export * from './utils/ssrfProtection';
export * from './utils/xmlParser.secure';

// Types
export * from './types';

// Persistence (NEW)
export * from './persistence/SoDViolationRepository';
export * from './persistence/TenantProfileRepository';

// Repositories
export * from './repositories';

// Prisma Client
export { PrismaClient } from './generated/prisma';

// Services
export * from './services/GDPRService';
export * from './services/DataRetentionService';

// Rules (moved from services package to break cyclic dependency)
export * from './rules';

// Audit Trail (Phase 2 - P1)
export * from './audit/EventTypes';
export * from './audit/AuditLogger';
export { auditLogger } from './audit/AuditLogger';

// Reporting (Phase 2 - P1)
export * from './reporting/ReportGenerator';
export { reportGenerator } from './reporting/ReportGenerator';

// Automation (Phase 2 - P1)
export * from './automation/AutomationEngine';
export { automationEngine } from './automation/AutomationEngine';

// Infrastructure (NEW - P0 Critical Features)
export * from './infrastructure';
export * from './queue/QueueManager';
export * from './queue/queues';
export * from './email/EmailService';
export * from './email/templates';
export * from './scheduler/CronManager';
export * from './scheduler/jobs';