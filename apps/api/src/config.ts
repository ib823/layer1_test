function bool(v: string | undefined, def = false) {
  if (v == null) return def;
  return /^(1|true|yes|on)$/i.test(v);
}
function num(v: string | undefined, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export const config = {
  dbUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/sapframework',
  logLevel: process.env.LOG_LEVEL || 'info',

  // auth
  featureAuth: bool(process.env.FEATURE_AUTH, true),
  featureAuthDev: bool(process.env.FEATURE_AUTH_DEV, true),
  jwtSecret: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET must be set in production. Generate with: openssl rand -base64 32');
      }
      console.warn('⚠️  JWT_SECRET not set, using insecure default for DEVELOPMENT ONLY');
      return 'INSECURE-DEV-SECRET-DO-NOT-USE-IN-PRODUCTION';
    }
    return secret;
  })(),
  jwtIssuer: process.env.JWT_ISSUER || 'sapmvp',
  jwtAccessTtl: num(process.env.JWT_ACCESS_TTL, 900),

  // magic link
  magicLinkTtl: num(process.env.MAGIC_LINK_TTL, 900),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',

  // audit
  featureAudit: bool(process.env.FEATURE_AUDIT, true),

  // rate limit
  featureRateLimit: bool(process.env.FEATURE_RATE_LIMIT, true),
  rateLimitPerMin: num(process.env.RATE_LIMIT_PER_MINUTE, 60),

  // discovery
  featureDiscovery: bool(process.env.FEATURE_DISCOVERY, true),

  // connectors & telemetry
  featureConnectors: bool(process.env.FEATURE_CONNECTORS, true),
  featureTelemetry: bool(process.env.FEATURE_TELEMETRY, true),

  // valkey/redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
};
