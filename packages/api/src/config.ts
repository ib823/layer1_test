import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost/sapframework',

  auth: {
    enabled: process.env.AUTH_ENABLED === 'true',
    xsuaaUrl: process.env.XSUAA_URL,
    xsuaaClientId: process.env.XSUAA_CLIENT_ID,
    xsuaaClientSecret: process.env.XSUAA_CLIENT_SECRET,
  },

  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  security: {
    sodEnforcement: {
      enabled: process.env.SOD_ENFORCEMENT_ENABLED === 'true',
      failOpen: process.env.SOD_ENFORCEMENT_FAIL_OPEN === 'true',
      sensitiveOperations: [
        'FINANCIAL_POST',
        'PAYMENT_APPROVAL',
        'VENDOR_CREATE',
        'USER_ROLE_ASSIGN',
        'BUDGET_APPROVE',
      ],
    },
    auditLog: {
      enabled: process.env.AUDIT_LOG_ENABLED !== 'false', // Default enabled
      retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365', 10),
    },
    dataResidency: {
      enabled: process.env.DATA_RESIDENCY_ENABLED === 'true',
      defaultRegion: process.env.DATA_RESIDENCY_DEFAULT_REGION || 'EU',
      failOpen: process.env.DATA_RESIDENCY_FAIL_OPEN === 'true',
    },
    encryption: {
      atRestRequired: process.env.ENCRYPTION_AT_REST_REQUIRED === 'true',
    },
  },

  gdpr: {
    piiMasking: process.env.GDPR_PII_MASKING_ENABLED !== 'false', // Default enabled
    dataRetentionDays: parseInt(process.env.GDPR_DATA_RETENTION_DAYS || '2555', 10), // 7 years
  },
};