/**
 * Security Configuration Validation
 *
 * Validates security-critical environment variables before startup
 * Prevents production deployment with weak/default credentials
 */

export interface SecurityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * List of insecure/default values that should never be used in production
 */
const INSECURE_VALUES = new Set([
  'dev-secret',
  'test-secret',
  'change-me',
  'changeme',
  'secret',
  'password',
  'admin',
  '123456',
  'test',
  'CHANGE-THIS-IN-PRODUCTION-use-openssl-rand-base64-32',
]);

/**
 * Check if a value appears to be weak/default
 */
function isWeakValue(value: string | undefined): boolean {
  if (!value) return true;

  const normalized = value.toLowerCase().replace(/[_-]/g, '');

  // Check against known insecure values
  if (INSECURE_VALUES.has(value) || INSECURE_VALUES.has(normalized)) {
    return true;
  }

  // Check if value contains "test", "dev", "change", "example"
  if (/test|dev|change|example|sample|demo|default/i.test(value)) {
    return true;
  }

  // Check minimum length (secrets should be at least 32 chars)
  if (value.length < 32) {
    return true;
  }

  return false;
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(env: NodeJS.ProcessEnv = process.env): SecurityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isProduction = env.NODE_ENV === 'production';
  const authEnabled = env.AUTH_ENABLED !== 'false';

  // 1. Check AUTH_ENABLED in production
  if (isProduction && !authEnabled) {
    errors.push(
      'CRITICAL: AUTH_ENABLED is disabled in production environment. ' +
      'This is a severe security risk. Set AUTH_ENABLED=true immediately.'
    );
  }

  // 2. Check JWT_SECRET
  if (authEnabled) {
    const jwtSecret = env.JWT_SECRET;

    if (!jwtSecret) {
      if (isProduction) {
        errors.push('CRITICAL: JWT_SECRET is not set. Generate a strong secret with: openssl rand -base64 32');
      } else {
        warnings.push('JWT_SECRET is not set. Using default for development only.');
      }
    } else if (isWeakValue(jwtSecret)) {
      if (isProduction) {
        errors.push(
          'CRITICAL: JWT_SECRET appears to be weak or default. ' +
          'Generate a strong secret with: openssl rand -base64 32'
        );
      } else {
        warnings.push('JWT_SECRET appears weak. Recommended to use a strong secret even in development.');
      }
    }
  }

  // 3. Check ENCRYPTION_MASTER_KEY
  const encryptionKey = env.ENCRYPTION_MASTER_KEY;

  if (!encryptionKey) {
    if (isProduction) {
      errors.push(
        'CRITICAL: ENCRYPTION_MASTER_KEY is not set. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    } else {
      warnings.push('ENCRYPTION_MASTER_KEY not set. Required for production.');
    }
  } else if (isWeakValue(encryptionKey)) {
    errors.push('CRITICAL: ENCRYPTION_MASTER_KEY appears to be weak or default.');
  }

  // 4. Check database credentials (if not using connection string)
  const dbUrl = env.DATABASE_URL || '';
  if (dbUrl.includes('postgres:postgres@') && isProduction) {
    errors.push('CRITICAL: Database using default postgres:postgres credentials in production.');
  }

  // 5. Check Redis credentials
  const redisUrl = env.REDIS_URL || '';
  if (isProduction && !redisUrl) {
    warnings.push('REDIS_URL not set. Distributed rate limiting will not work in multi-instance deployments.');
  }

  // 6. Check SAP credentials
  if (env.SAP_CLIENT_ID && isWeakValue(env.SAP_CLIENT_ID)) {
    warnings.push('SAP_CLIENT_ID appears to be a placeholder value.');
  }

  if (env.SAP_CLIENT_SECRET && isWeakValue(env.SAP_CLIENT_SECRET)) {
    errors.push('SAP_CLIENT_SECRET appears to be weak or default.');
  }

  // 7. Check CORS origin
  if (isProduction && env.CORS_ORIGIN === 'http://localhost:3001') {
    errors.push('CRITICAL: CORS_ORIGIN is set to localhost in production. Update to your production domain.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and throw if security config is invalid in production
 */
export function enforceSecurityConfig(env: NodeJS.ProcessEnv = process.env): void {
  const result = validateSecurityConfig(env);

  // Always log warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  Security Configuration Warnings:');
    result.warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  // In production, fail on errors
  if (!result.valid) {
    console.error('❌ Security Configuration Errors:');
    result.errors.forEach(error => console.error(`   - ${error}`));
    console.error('');

    if (env.NODE_ENV === 'production') {
      console.error('💀 FATAL: Cannot start in production with security configuration errors.');
      console.error('    Fix the errors above and restart the application.');
      process.exit(1);
    } else {
      console.warn('⚠️  Development mode: Continuing despite errors (would fail in production)');
    }
  } else if (result.warnings.length === 0) {
    console.log('✅ Security configuration validated successfully');
  }
}
