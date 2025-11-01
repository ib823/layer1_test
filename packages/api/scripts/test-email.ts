#!/usr/bin/env node
/**
 * Email Service Test Script
 *
 * Tests email delivery with the configured provider (Resend/SMTP/Test)
 *
 * Usage:
 *   pnpm test:email <recipient-email>
 *   pnpm test:email test@example.com
 */

import { EmailService } from '@sap-framework/core';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmail(recipientEmail: string) {
  console.log('📧 Email Service Test\n');
  console.log('═══════════════════════════════════════════════\n');

  // Initialize Email Service
  try {
    const emailProvider = (process.env.EMAIL_PROVIDER || 'test') as 'resend' | 'smtp' | 'test';

    console.log(`📌 Provider: ${emailProvider}`);
    console.log(`📌 From: ${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_EMAIL}>`);
    console.log(`📌 To: ${recipientEmail}\n`);

    const emailConfig = {
      provider: emailProvider,
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Prism',
        email: process.env.EMAIL_FROM_EMAIL || 'noreply@sapgrc.com',
      },
      ...(emailProvider === 'resend' && {
        resend: {
          apiKey: process.env.RESEND_API_KEY || '',
        },
      }),
      ...(emailProvider === 'smtp' && {
        smtp: {
          host: process.env.SMTP_HOST || '',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
        },
      }),
    };

    EmailService.initialize(emailConfig);
    console.log('✅ Email service initialized\n');

    // Test 1: Password Reset Email
    console.log('📨 Test 1: Sending password reset email...');
    const result1 = await EmailService.getInstance().sendEmail({
      to: recipientEmail,
      subject: 'Test Email - Password Reset',
      template: 'password-reset',
      data: {
        recipientName: 'Test User',
        resetLink: 'http://localhost:3001/auth/reset-password?token=test-token-123',
        expiresIn: '1 hour',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Script)',
      },
    });

    if (result1.success) {
      console.log(`✅ Test 1 passed!`);
      if (result1.messageId) console.log(`   Message ID: ${result1.messageId}`);
      if (result1.previewUrl) console.log(`   Preview URL: ${result1.previewUrl}`);
    } else {
      console.error(`❌ Test 1 failed: ${result1.error}`);
    }
    console.log('');

    // Test 2: New Login Confirmation
    console.log('📨 Test 2: Sending new login confirmation email...');
    const result2 = await EmailService.getInstance().sendEmail({
      to: recipientEmail,
      subject: 'Test Email - New Login Detected',
      template: 'new-login-confirmation',
      data: {
        recipientName: 'Test User',
        deviceInfo: 'Chrome on MacOS',
        location: 'San Francisco, California, USA',
        ipAddress: '192.168.1.100',
        timestamp: new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
        }),
        confirmLink: 'http://localhost:3001/auth/confirm-login?token=confirm-123',
        denyLink: 'http://localhost:3001/auth/deny-login?token=deny-123',
        expiresIn: '1 hour',
      },
    });

    if (result2.success) {
      console.log(`✅ Test 2 passed!`);
      if (result2.messageId) console.log(`   Message ID: ${result2.messageId}`);
      if (result2.previewUrl) console.log(`   Preview URL: ${result2.previewUrl}`);
    } else {
      console.error(`❌ Test 2 failed: ${result2.error}`);
    }
    console.log('');

    // Test 3: MFA Enabled
    console.log('📨 Test 3: Sending MFA enabled confirmation...');
    const result3 = await EmailService.getInstance().sendEmail({
      to: recipientEmail,
      subject: 'Test Email - MFA Enabled',
      template: 'mfa-enabled',
      data: {
        recipientName: 'Test User',
        mfaMethod: 'Authenticator App (TOTP)',
        enabledAt: new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
        }),
        ipAddress: '192.168.1.100',
        deviceInfo: 'Chrome on MacOS',
      },
    });

    if (result3.success) {
      console.log(`✅ Test 3 passed!`);
      if (result3.messageId) console.log(`   Message ID: ${result3.messageId}`);
      if (result3.previewUrl) console.log(`   Preview URL: ${result3.previewUrl}`);
    } else {
      console.error(`❌ Test 3 failed: ${result3.error}`);
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════\n');
    const passed = [result1.success, result2.success, result3.success].filter(Boolean).length;
    const total = 3;

    if (passed === total) {
      console.log(`✅ All tests passed! (${passed}/${total})`);
      console.log('\n🎉 Email service is working correctly!\n');
    } else {
      console.log(`⚠️  ${passed}/${total} tests passed`);
      console.log('\n❌ Some emails failed to send. Check the errors above.\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Email service initialization failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your .env file has correct EMAIL_* variables');
    console.error('2. If using Resend, verify RESEND_API_KEY is set');
    console.error('3. If using SMTP, verify all SMTP_* variables are set');
    console.error('4. Check RESEND_EMAIL_SETUP.md for detailed setup guide\n');
    process.exit(1);
  }
}

// Parse command line arguments
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('❌ Error: Recipient email is required\n');
  console.log('Usage:');
  console.log('  pnpm test:email <recipient-email>');
  console.log('  pnpm test:email test@example.com\n');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(recipientEmail)) {
  console.error(`❌ Error: Invalid email format: ${recipientEmail}\n`);
  process.exit(1);
}

// Run tests
testEmail(recipientEmail).catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
