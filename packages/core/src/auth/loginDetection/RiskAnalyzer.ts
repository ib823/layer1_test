import Redis from 'ioredis';
import { PrismaClient } from '../../generated/prisma';
import logger from '../../utils/logger';

export interface RiskAnalysisParams {
  userId: string;
  email: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  country?: string;
  city?: string;
  isTrustedDevice: boolean;
  isNewLocation: boolean;
}

export interface RiskAssessment {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  requiresEmailConfirmation: boolean;
  requiresMFA: boolean;
  shouldBlock: boolean;
  isNewDevice: boolean;
  isNewLocation: boolean;
}

/**
 * Risk Analyzer
 *
 * Calculates risk scores for login attempts based on various factors:
 * - Device trust status
 * - Location changes
 * - Failed login history
 * - Velocity checks (multiple logins from different locations)
 * - Known malicious IPs
 * - Unusual login times
 */
export class RiskAnalyzer {
  private redis: Redis;
  private prisma: PrismaClient;

  // Risk score weights (total = 100)
  private weights = {
    newDevice: 20,
    newLocation: 15,
    recentFailures: 25,
    velocityCheck: 20,
    unusualTime: 10,
    knownThreat: 10,
  };

  // Risk thresholds
  private thresholds = {
    emailConfirmation: 30,
    mfaRequired: 50,
    block: 80,
  };

  constructor(redis: Redis, prisma: PrismaClient) {
    this.redis = redis;
    this.prisma = prisma;
  }

  /**
   * Calculate risk score for login attempt
   */
  async calculateRiskScore(params: RiskAnalysisParams): Promise<RiskAssessment> {
    const {
      userId,
      email,
      deviceFingerprint,
      ipAddress,
      country,
      city,
      isTrustedDevice,
      isNewLocation,
    } = params;

    let totalScore = 0;
    const riskFactors: string[] = [];

    // 1. New device check (20 points)
    if (!isTrustedDevice) {
      totalScore += this.weights.newDevice;
      riskFactors.push('new_device');
    }

    // 2. New location check (15 points)
    if (isNewLocation) {
      totalScore += this.weights.newLocation;
      riskFactors.push('new_location');
    }

    // 3. Recent failed login attempts (25 points)
    const failureScore = await this.checkRecentFailures(email, ipAddress);
    totalScore += failureScore;
    if (failureScore > 0) {
      riskFactors.push(`recent_failures:${Math.round(failureScore)}`);
    }

    // 4. Velocity check - concurrent logins from different locations (20 points)
    const velocityScore = await this.checkVelocity(userId, ipAddress, country);
    totalScore += velocityScore;
    if (velocityScore > 0) {
      riskFactors.push(`velocity_anomaly:${Math.round(velocityScore)}`);
    }

    // 5. Unusual login time (10 points)
    const timeScore = await this.checkUnusualTime(userId);
    totalScore += timeScore;
    if (timeScore > 0) {
      riskFactors.push(`unusual_time:${Math.round(timeScore)}`);
    }

    // 6. Known malicious IP (10 points)
    const threatScore = await this.checkKnownThreats(ipAddress);
    totalScore += threatScore;
    if (threatScore > 0) {
      riskFactors.push(`known_threat:${Math.round(threatScore)}`);
    }

    // Normalize to 0-100
    totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

    const riskLevel = this.getRiskLevel(totalScore);
    const requiresEmailConfirmation = totalScore >= this.thresholds.emailConfirmation;
    const requiresMFA = totalScore >= this.thresholds.mfaRequired;
    const shouldBlock = totalScore >= this.thresholds.block;

    logger.info('Risk analysis completed', {
      userId,
      email,
      riskScore: totalScore,
      riskLevel,
      riskFactors,
      isTrustedDevice,
      isNewLocation,
    });

    return {
      riskScore: totalScore,
      riskLevel,
      riskFactors,
      requiresEmailConfirmation,
      requiresMFA,
      shouldBlock,
      isNewDevice: !isTrustedDevice,
      isNewLocation,
    };
  }

  /**
   * Helper method to analyze a login attempt (used by NewLoginDetector)
   */
  async analyzeLoginAttempt(
    userId: string,
    ipAddress: string,
    deviceFingerprint: string,
    userAgent: string
  ): Promise<RiskAssessment> {
    // Check if device is trusted
    const trustedDevice = await this.prisma.trustedDevice.findFirst({
      where: {
        userId,
        deviceFingerprint,
        revokedAt: null,
      },
    });

    const isTrustedDevice = !!trustedDevice;

    // Check if location is new by querying historical login data
    const isNewLocation = await this.checkIfNewLocation(userId, ipAddress);

    // Get user email
    // TODO: This assumes we have a user table - adjust based on your schema
    const email = ''; // Placeholder

    return this.calculateRiskScore({
      userId,
      email,
      deviceFingerprint,
      ipAddress,
      userAgent,
      isTrustedDevice,
      isNewLocation,
    });
  }

  /**
   * Check if this is a new location for the user
   * Queries historical login attempts to see if user has logged in from this IP before
   */
  private async checkIfNewLocation(userId: string, ipAddress: string): Promise<boolean> {
    // Check if user has successful login from this IP in the past
    const previousLogin = await this.prisma.loginAttempt.findFirst({
      where: {
        userId,
        ipAddress,
        status: 'success',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // If no previous successful login from this IP, it's a new location
    if (!previousLogin) {
      logger.debug('New location detected', { userId, ipAddress });
      return true;
    }

    // Check if the previous login was recent (within 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    if (previousLogin.createdAt < ninetyDaysAgo) {
      // Old location (>90 days) - treat as new for safety
      logger.debug('Old location detected (>90 days)', {
        userId,
        ipAddress,
        lastLoginDate: previousLogin.createdAt
      });
      return true;
    }

    // Known recent location
    logger.debug('Known location detected', {
      userId,
      ipAddress,
      lastLoginDate: previousLogin.createdAt
    });
    return false;
  }

  /**
   * Check for recent failed login attempts
   * Returns score 0-25 based on failure frequency
   */
  private async checkRecentFailures(
    email: string,
    ipAddress: string
  ): Promise<number> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check failures by email
    const emailFailures = await this.prisma.loginAttempt.count({
      where: {
        email,
        status: { in: ['failed_password', 'failed_mfa', 'blocked'] },
        createdAt: { gte: oneHourAgo },
      },
    });

    // Check failures by IP
    const ipFailures = await this.prisma.loginAttempt.count({
      where: {
        ipAddress,
        status: { in: ['failed_password', 'failed_mfa', 'blocked'] },
        createdAt: { gte: oneHourAgo },
      },
    });

    // Calculate score (max 25)
    let score = 0;

    // Email-based failures (more weight)
    if (emailFailures >= 5) {
      score += 25; // 5+ failures in an hour = max risk
    } else if (emailFailures >= 3) {
      score += 20;
    } else if (emailFailures >= 1) {
      score += 10;
    }

    // IP-based failures (less weight, but still important)
    if (ipFailures >= 10) {
      score += 15; // Many failures from same IP
    } else if (ipFailures >= 5) {
      score += 10;
    }

    return Math.min(25, score);
  }

  /**
   * Check for velocity anomalies (concurrent logins from different locations)
   * Returns score 0-20
   */
  private async checkVelocity(
    userId: string,
    currentIP: string,
    currentCountry?: string
  ): Promise<number> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Check recent successful logins from different IPs
    const recentLogins = await this.prisma.loginAttempt.findMany({
      where: {
        userId,
        status: 'success',
        createdAt: { gte: fiveMinutesAgo },
        ipAddress: { not: currentIP },
      },
      select: {
        ipAddress: true,
        country: true,
        city: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (recentLogins.length === 0) {
      return 0;
    }

    let score = 0;

    // Check for different countries (impossible travel)
    const differentCountries = recentLogins.filter(
      (login: any) => login.country && login.country !== currentCountry
    );

    if (differentCountries.length > 0) {
      // Logins from different countries within 5 minutes = high risk
      score += 20;
    } else if (recentLogins.length >= 2) {
      // Multiple logins from different IPs in same country
      score += 10;
    }

    return score;
  }

  /**
   * Check if login is at unusual time for this user
   * Returns score 0-10
   */
  private async checkUnusualTime(userId: string): Promise<number> {
    const now = new Date();
    const hour = now.getHours();

    // Very late night (2 AM - 6 AM) is generally suspicious
    if (hour >= 2 && hour < 6) {
      // Query user's history to see if they normally log in at this time
      const hasHistoricalNightLogins = await this.checkHistoricalLoginPattern(
        userId,
        2,
        6
      );

      if (!hasHistoricalNightLogins) {
        // User never logs in during these hours - suspicious
        return 10;
      } else {
        // User has logged in at night before - less suspicious
        return 3;
      }
    }

    return 0;
  }

  /**
   * Check if user has historical login pattern for given hour range
   */
  private async checkHistoricalLoginPattern(
    userId: string,
    startHour: number,
    endHour: number
  ): Promise<boolean> {
    // Query last 30 days of successful logins
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalLogins = await this.prisma.loginAttempt.findMany({
      where: {
        userId,
        status: 'success',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
      },
    });

    // Check if any historical login falls in the specified hour range
    const hasPatternMatch = historicalLogins.some((login) => {
      const loginHour = login.createdAt.getHours();
      return loginHour >= startHour && loginHour < endHour;
    });

    logger.debug('Historical login pattern check', {
      userId,
      hourRange: `${startHour}-${endHour}`,
      historicalCount: historicalLogins.length,
      hasPatternMatch,
    });

    return hasPatternMatch;
  }

  /**
   * Check if IP is from a known malicious source
   * Returns score 0-10
   */
  private async checkKnownThreats(ipAddress: string): Promise<number> {
    // Check Redis blocklist
    const isBlocked = await this.redis.get(`blocklist:ip:${ipAddress}`);
    if (isBlocked) {
      return 10;
    }

    // Check if IP has had many recent failures across all users
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentIPFailures = await this.prisma.loginAttempt.count({
      where: {
        ipAddress,
        status: { in: ['failed_password', 'failed_mfa', 'blocked'] },
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentIPFailures >= 20) {
      // Many failures from this IP across all users = likely attack
      // Add to short-term blocklist (1 hour)
      await this.redis.setex(`blocklist:ip:${ipAddress}`, 3600, 'auto');
      return 10;
    }

    return 0;
  }

  /**
   * Determine risk level from score
   */
  private getRiskLevel(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Record failed login attempt for future risk analysis
   */
  async recordFailedAttempt(
    email: string,
    ipAddress: string,
    failureReason: string
  ): Promise<void> {
    // Increment failure counter in Redis
    const key = `login:failures:${email}`;
    const count = await this.redis.incr(key);

    // Set expiry on first failure
    if (count === 1) {
      await this.redis.expire(key, 3600); // 1 hour
    }

    logger.warn('Failed login attempt recorded', {
      email,
      ipAddress,
      failureReason,
      failureCount: count,
    });
  }

  /**
   * Clear failure counters (e.g., after successful login)
   */
  async clearFailureCounters(email: string): Promise<void> {
    await this.redis.del(`login:failures:${email}`);
  }

  /**
   * Add IP to blocklist (manual intervention)
   */
  async blockIP(ipAddress: string, durationSeconds: number = 86400): Promise<void> {
    await this.redis.setex(`blocklist:ip:${ipAddress}`, durationSeconds, 'manual');
    logger.warn('IP address blocked', { ipAddress, durationSeconds });
  }

  /**
   * Remove IP from blocklist
   */
  async unblockIP(ipAddress: string): Promise<void> {
    await this.redis.del(`blocklist:ip:${ipAddress}`);
    logger.info('IP address unblocked', { ipAddress });
  }

  /**
   * Check if IP is currently blocked
   */
  async isIPBlocked(ipAddress: string): Promise<boolean> {
    const blocked = await this.redis.get(`blocklist:ip:${ipAddress}`);
    return blocked !== null;
  }
}
