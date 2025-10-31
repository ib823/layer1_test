import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';
import { PrismaClient } from '../../generated/prisma';
import Redis from 'ioredis';
import logger from '../../utils/logger';

export interface PasskeyRegistrationOptions {
  options: PublicKeyCredentialCreationOptionsJSON;
  challenge: string;
}

export interface PasskeyAuthenticationOptions {
  options: PublicKeyCredentialRequestOptionsJSON;
  challenge: string;
}

export interface PasskeyVerificationResult {
  verified: boolean;
  credentialId?: string;
  counter?: bigint;
  error?: string;
}

/**
 * PasskeyService - WebAuthn/FIDO2 Implementation
 *
 * Provides passwordless authentication using passkeys (FIDO2/WebAuthn).
 * Features:
 * - Platform authenticators (Face ID, Touch ID, Windows Hello)
 * - Cross-platform authenticators (YubiKey, security keys)
 * - Phishing-resistant authentication
 * - No shared secrets (public key cryptography)
 */
export class PasskeyService {
  private prisma: PrismaClient;
  private redis: Redis;
  private rpId: string; // Relying Party ID (e.g., "example.com")
  private rpName: string; // Relying Party Name (e.g., "Prism")
  private origin: string; // Origin (e.g., "https://example.com")

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    rpId: string,
    rpName: string,
    origin: string
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.rpId = rpId;
    this.rpName = rpName;
    this.origin = origin;
  }

  /**
   * Generate registration options for new passkey
   */
  async generateRegistrationOptions(
    userId: string,
    userEmail: string,
    userName: string
  ): Promise<PasskeyRegistrationOptions> {
    // Get existing credentials for this user (for excluded credentials)
    const existingCredentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: new TextEncoder().encode(userId),
      userName: userEmail,
      userDisplayName: userName,
      // Exclude existing credentials (prevents re-registering same device)
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransport[],
      })),
      // Attestation: 'none' for privacy, 'direct' for enterprise
      attestationType: 'none',
      // Supported algorithms (ES256, RS256)
      supportedAlgorithmIDs: [-7, -257],
      // Authenticator selection
      authenticatorSelection: {
        // Allow both platform (built-in) and cross-platform (USB keys)
        authenticatorAttachment: undefined,
        // Require user verification (PIN, biometric, etc.)
        userVerification: 'preferred',
        // Allow discoverable credentials (resident keys)
        residentKey: 'preferred',
      },
    });

    // Store challenge in Redis (expires in 5 minutes)
    const challengeKey = `passkey:challenge:registration:${userId}`;
    await this.redis.setex(challengeKey, 300, options.challenge);

    logger.info('Passkey registration options generated', { userId });

    return {
      options,
      challenge: options.challenge,
    };
  }

  /**
   * Verify passkey registration response
   */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    deviceName?: string
  ): Promise<PasskeyVerificationResult> {
    // Get stored challenge
    const challengeKey = `passkey:challenge:registration:${userId}`;
    const expectedChallenge = await this.redis.get(challengeKey);

    if (!expectedChallenge) {
      return {
        verified: false,
        error: 'Challenge expired or invalid',
      };
    }

    try {
      // Verify the registration response
      const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        supportedAlgorithmIDs: [-7, -257],
      });

      if (!verification.verified || !verification.registrationInfo) {
        return {
          verified: false,
          error: 'Verification failed',
        };
      }

      const { credential, credentialDeviceType, credentialBackedUp, aaguid, fmt } =
        verification.registrationInfo;

      // Store credential in database
      await this.prisma.webAuthnCredential.create({
        data: {
          userId,
          credentialId: Buffer.from(credential.id).toString('base64'),
          credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
          counter: BigInt(credential.counter),
          transports: response.response.transports || [],
          deviceName: deviceName || `${credentialDeviceType} Authenticator`,
          deviceType: credentialDeviceType,
          aaguid: aaguid,
          attestationFormat: fmt,
        },
      });

      // Enable passkey MFA for user
      await this.prisma.userMFAConfig.upsert({
        where: { userId },
        create: {
          userId,
          mfaEnabled: true,
          passkeyEnabled: true,
          passkeySetupAt: new Date(),
        },
        update: {
          mfaEnabled: true,
          passkeyEnabled: true,
          passkeySetupAt: new Date(),
        },
      });

      // Clear challenge
      await this.redis.del(challengeKey);

      logger.info('Passkey registered successfully', {
        userId,
        credentialId: Buffer.from(credential.id).toString('base64'),
        deviceType: credentialDeviceType,
      });

      return {
        verified: true,
        credentialId: Buffer.from(credential.id).toString('base64'),
        counter: BigInt(credential.counter),
      };
    } catch (error: any) {
      logger.error('Passkey registration verification failed', { error, userId });
      return {
        verified: false,
        error: error.message || 'Verification error',
      };
    }
  }

  /**
   * Generate authentication options for passkey login
   */
  async generateAuthenticationOptions(userId?: string): Promise<PasskeyAuthenticationOptions> {
    let allowCredentials: { id: string; transports?: any }[] | undefined;

    // If userId provided, get their credentials (user verification flow)
    if (userId) {
      const userCredentials = await this.prisma.webAuthnCredential.findMany({
        where: { userId },
        select: { credentialId: true, transports: true },
      });

      allowCredentials = userCredentials.map((cred: any) => ({
        id: cred.credentialId, // Already base64 string from DB
        transports: cred.transports as any,
      }));
    }
    // Otherwise, allow any credential (discoverable/resident key flow)

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store challenge in Redis (expires in 5 minutes)
    const challengeKey = userId
      ? `passkey:challenge:auth:${userId}`
      : `passkey:challenge:auth:${options.challenge}`;
    await this.redis.setex(challengeKey, 300, options.challenge);

    logger.info('Passkey authentication options generated', { userId: userId || 'unknown' });

    return {
      options,
      challenge: options.challenge,
    };
  }

  /**
   * Verify passkey authentication response
   */
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    userId?: string
  ): Promise<PasskeyVerificationResult & { userId?: string }> {
    // Get credential from database
    const credentialId = response.id; // Already base64url string from response
    const credential = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId },
      select: {
        userId: true,
        credentialId: true,
        credentialPublicKey: true,
        counter: true,
        transports: true,
      },
    });

    if (!credential) {
      return {
        verified: false,
        error: 'Credential not found',
      };
    }

    // If userId provided, verify it matches the credential
    if (userId && credential.userId !== userId) {
      return {
        verified: false,
        error: 'Credential does not belong to user',
      };
    }

    // Get stored challenge
    const challengeKey = userId
      ? `passkey:challenge:auth:${userId}`
      : `passkey:challenge:auth:${response.response.clientDataJSON}`;

    // Try to get challenge from multiple possible keys
    let expectedChallenge = await this.redis.get(challengeKey);

    // If not found and no userId, try to extract from response
    if (!expectedChallenge && !userId) {
      // In discoverable credential flow, we need to find the challenge
      // This is a simplified approach - in production, use a more robust method
      const clientDataJSON = Buffer.from(response.response.clientDataJSON, 'base64url').toString();
      const clientData = JSON.parse(clientDataJSON);
      const challengeFromResponse = clientData.challenge;
      const fallbackKey = `passkey:challenge:auth:${challengeFromResponse}`;
      expectedChallenge = await this.redis.get(fallbackKey);
    }

    if (!expectedChallenge) {
      return {
        verified: false,
        error: 'Challenge expired or invalid',
      };
    }

    try {
      // Verify the authentication response
      const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        credential: {
          id: credential.credentialId, // Already base64 string from DB
          publicKey: Buffer.from(credential.credentialPublicKey, 'base64'),
          counter: Number(credential.counter),
          transports: credential.transports as any,
        },
      });

      if (!verification.verified) {
        return {
          verified: false,
          error: 'Authentication failed',
        };
      }

      const { authenticationInfo } = verification;

      // Update credential counter and last used time
      await this.prisma.webAuthnCredential.update({
        where: { credentialId },
        data: {
          counter: BigInt(authenticationInfo.newCounter),
          lastUsedAt: new Date(),
        },
      });

      // Clear challenge
      await this.redis.del(challengeKey);

      logger.info('Passkey authentication successful', {
        userId: credential.userId,
        credentialId,
      });

      return {
        verified: true,
        credentialId,
        counter: BigInt(authenticationInfo.newCounter),
        userId: credential.userId,
      };
    } catch (error: any) {
      logger.error('Passkey authentication verification failed', {
        error,
        userId: credential.userId,
      });
      return {
        verified: false,
        error: error.message || 'Verification error',
      };
    }
  }

  /**
   * Get user's passkeys
   */
  async getUserPasskeys(userId: string): Promise<
    Array<{
      id: string;
      deviceName: string | null;
      deviceType: string | null;
      lastUsedAt: Date | null;
      createdAt: Date;
    }>
  > {
    const credentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return credentials;
  }

  /**
   * Remove a passkey
   */
  async removePasskey(userId: string, credentialId: string): Promise<void> {
    await this.prisma.webAuthnCredential.delete({
      where: {
        id: credentialId,
        userId, // Ensure user owns this credential
      },
    });

    // Check if user has any remaining passkeys
    const remainingCount = await this.prisma.webAuthnCredential.count({
      where: { userId },
    });

    // If no passkeys left, disable passkey MFA
    if (remainingCount === 0) {
      const mfaConfig = await this.prisma.userMFAConfig.findUnique({
        where: { userId },
        select: { totpEnabled: true },
      });

      await this.prisma.userMFAConfig.update({
        where: { userId },
        data: {
          passkeyEnabled: false,
          // Only disable MFA entirely if TOTP is also disabled
          mfaEnabled: mfaConfig?.totpEnabled || false,
        },
      });
    }

    logger.info('Passkey removed', { userId, credentialId });
  }

  /**
   * Rename a passkey
   */
  async renamePasskey(
    userId: string,
    credentialId: string,
    newName: string
  ): Promise<void> {
    await this.prisma.webAuthnCredential.update({
      where: {
        id: credentialId,
        userId, // Ensure user owns this credential
      },
      data: {
        deviceName: newName,
      },
    });

    logger.info('Passkey renamed', { userId, credentialId, newName });
  }

  /**
   * Check if user has passkeys enabled
   */
  async isPasskeyEnabled(userId: string): Promise<boolean> {
    const mfaConfig = await this.prisma.userMFAConfig.findUnique({
      where: { userId },
      select: { passkeyEnabled: true },
    });

    return mfaConfig?.passkeyEnabled || false;
  }
}
