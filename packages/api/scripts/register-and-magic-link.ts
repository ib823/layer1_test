#!/usr/bin/env node
/**
 * Email Registration & Magic Link Script
 *
 * This script will:
 * 1. Register a user email
 * 2. Generate a magic link token
 * 3. Send the magic link to a specified recipient email via Resend
 *
 * Usage:
 *   pnpm register:magic-link <email-to-register> <recipient-email> [resend-api-key]
 *   pnpm register:magic-link ikmls@hotmail.com ikmal.baharudin@gmail.com re_your_key
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'packages/api/.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import {
  generatePasswordResetToken,
  hashToken,
  sanitizeEmail,
  getEmailService,
  getExpiryTimeString,
} from '@sap-framework/core';
import Redis from 'ioredis';
import logger from '../utils/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface RegistrationResult {
  success: boolean;
  message: string;
  email?: string;
  registrationToken?: string;
  magicLink?: string;
  expiresAt?: Date;
  error?: string;
}

async function registerAndSendMagicLink(
  emailToRegister: string,
  recipientEmail: string,
  resendApiKey?: string
): Promise<RegistrationResult> {
  try {
    console.log('\n📧 Email Registration & Magic Link Generator');
    console.log('═══════════════════════════════════════════════\n');

    // Validate email formats
    let sanitizedRegisterEmail: string;
    let sanitizedRecipientEmail: string;

    try {
      sanitizedRegisterEmail = sanitizeEmail(emailToRegister);
      sanitizedRecipientEmail = sanitizeEmail(recipientEmail);
    } catch (error) {
      return {
        success: false,
        message: 'Invalid email format',
        error: String(error),
      };
    }

    console.log(`📌 Registering Email: ${sanitizedRegisterEmail}`);
    console.log(`📌 Send Magic Link To: ${sanitizedRecipientEmail}`);
    console.log(`📌 Email Provider: ${process.env.EMAIL_PROVIDER || 'test'}\n`);

    // Generate registration token (valid for 24 hours for magic link)
    const tokenData = generatePasswordResetToken(sanitizedRegisterEmail, 24 * 60); // 24 hours
    const registrationKey = `reg:${tokenData.hashedToken}`;
    const ttlSeconds = 24 * 60 * 60; // 24 hours

    // Store registration data in Redis
    const registrationData = {
      email: sanitizedRegisterEmail,
      magicLinkSentTo: sanitizedRecipientEmail,
      createdAt: new Date().toISOString(),
      expiresAt: tokenData.expiresAt.toISOString(),
      type: 'magic_link_registration',
    };

    console.log('💾 Storing registration token in Redis...');
    await redis.setex(registrationKey, ttlSeconds, JSON.stringify(registrationData));
    console.log('✅ Token stored (expires in 24 hours)\n');

    // Generate magic link
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:3001';
    const magicLink = `${baseUrl}/auth/verify-registration?token=${tokenData.token}`;

    console.log('🔗 Magic Link Generated:');
    console.log(`   ${magicLink}\n`);

    // Initialize email service if we have an API key
    if (resendApiKey) {
      console.log('📧 Initializing Resend email service...');

      const emailConfig = {
        provider: 'resend' as const,
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Prism',
          email: process.env.EMAIL_FROM_EMAIL || 'onboarding@resend.dev',
        },
        resend: {
          apiKey: resendApiKey,
        },
      };

      // Import and initialize EmailService
      const { EmailService } = await import('@sap-framework/core');
      EmailService.initialize(emailConfig);

      console.log('✅ Email service initialized\n');

      console.log('📨 Sending magic link email...');

      try {
        const result = await EmailService.getInstance().sendEmail({
          to: sanitizedRecipientEmail,
          subject: 'Your Magic Link - Prism Registration',
          template: 'user-invitation',
          data: {
            recipientName: sanitizedRecipientEmail.split('@')[0],
            invitationLink: magicLink,
            role: 'User',
            expiresIn: getExpiryTimeString(24 * 60),
          },
        });

        if (result.success) {
          console.log('✅ Email sent successfully!\n');
          if (result.messageId) console.log(`   Message ID: ${result.messageId}`);
          if (result.previewUrl) console.log(`   Preview URL: ${result.previewUrl}\n`);
        } else {
          console.error(`❌ Failed to send email: ${result.error}\n`);
        }
      } catch (emailError) {
        console.error(`❌ Email service error: ${emailError}\n`);
      }
    }

    // Display summary
    console.log('═══════════════════════════════════════════════');
    console.log('\n✅ Registration & Magic Link Generation Complete!\n');
    console.log('📋 Summary:');
    console.log(`   Email to Register: ${sanitizedRegisterEmail}`);
    console.log(`   Magic Link Sent To: ${sanitizedRecipientEmail}`);
    console.log(`   Expires At: ${tokenData.expiresAt.toLocaleString()}`);
    console.log(`   Token Validity: 24 hours\n`);

    console.log('🔑 Registration Token (for testing):');
    console.log(`   ${tokenData.token}\n`);

    console.log('🔗 Magic Link:');
    console.log(`   ${magicLink}\n`);

    console.log('✨ Next Steps:');
    console.log('   1. Check your email at:', sanitizedRecipientEmail);
    console.log('   2. Click the magic link (or copy the link above in browser)');
    console.log('   3. You will be verified and logged in');
    console.log('   4. Use email:', sanitizedRegisterEmail, 'to log in\n');

    return {
      success: true,
      message: 'Registration and magic link generation successful',
      email: sanitizedRegisterEmail,
      registrationToken: tokenData.token,
      magicLink,
      expiresAt: tokenData.expiresAt,
    };
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    return {
      success: false,
      message: 'Registration failed',
      error: error.message,
    };
  } finally {
    // Close Redis connection
    await redis.quit();
    process.exit(0);
  }
}

// Parse command line arguments
const emailToRegister = process.argv[2];
const recipientEmail = process.argv[3];
const resendApiKey = process.argv[4];

if (!emailToRegister || !recipientEmail) {
  console.error('\n❌ Error: Required arguments missing\n');
  console.log('Usage:');
  console.log('  pnpm register:magic-link <email-to-register> <recipient-email> [resend-api-key]');
  console.log('\nExample:');
  console.log('  pnpm register:magic-link ikmls@hotmail.com ikmal.baharudin@gmail.com re_your_api_key\n');
  console.log('If Resend API key not provided, the script will still generate the magic link');
  console.log('but will not send an email (test mode only).\n');
  process.exit(1);
}

// Validate email formats
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(emailToRegister) || !emailRegex.test(recipientEmail)) {
  console.error(`\n❌ Error: Invalid email format\n`);
  process.exit(1);
}

// Run the script
registerAndSendMagicLink(emailToRegister, recipientEmail, resendApiKey).catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
