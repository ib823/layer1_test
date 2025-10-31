#!/usr/bin/env node
/**
 * Simple Magic Link Generator (without Redis dependency)
 *
 * Usage:
 *   npx tsx scripts/send-magic-link-simple.ts <email-to-register> <recipient-email> <resend-api-key>
 */

import { Resend } from 'resend';
import crypto from 'crypto';

async function sendMagicLink(
  emailToRegister: string,
  recipientEmail: string,
  apiKey: string
) {
  try {
    console.log('\n📧 Magic Link Generator (Simple Mode)');
    console.log('═══════════════════════════════════════════════\n');

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToRegister) || !emailRegex.test(recipientEmail)) {
      throw new Error('Invalid email format');
    }

    console.log(`📌 Email to Register: ${emailToRegister}`);
    console.log(`📌 Send Magic Link To: ${recipientEmail}`);
    console.log(`📌 Email Provider: Resend\n`);

    // Generate magic token (random 32-byte hex string)
    const token = crypto.randomBytes(32).toString('hex');

    console.log('🔑 Generating magic link token...');
    console.log(`✅ Token generated (length: ${token.length})\n`);

    // Create magic link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const magicLink = `${baseUrl}/auth/verify-registration?token=${token}`;

    console.log('🔗 Magic Link URL:');
    console.log(`   ${magicLink}\n`);

    // Initialize Resend client
    console.log('📧 Initializing Resend client...');
    const resend = new Resend(apiKey);
    console.log('✅ Resend client ready\n');

    // Send email
    console.log('📨 Sending magic link email via Resend...');
    const emailResult = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: 'Your Magic Link - Prism Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0C2B87;">Welcome to Prism</h1>
          <p>Hi there,</p>
          <p>You've requested to register with email: <strong>${emailToRegister}</strong></p>
          <p>Click the button below to complete your registration:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}"
               style="background-color: #0C2B87;
                      color: white;
                      padding: 12px 30px;
                      text-decoration: none;
                      border-radius: 5px;
                      display: inline-block;
                      font-weight: bold;">
              Verify Email & Login
            </a>
          </div>
          <p>Or copy this link:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${magicLink}
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            <strong>Security Note:</strong> This link expires in 24 hours. If you didn't request this, please ignore this email.
          </p>
          <p style="color: #666; font-size: 12px;">
            Registration Email: ${emailToRegister}
          </p>
        </div>
      `,
    });

    if (emailResult.error) {
      throw new Error(`Resend error: ${emailResult.error.message}`);
    }

    console.log('✅ Email sent successfully!\n');
    if (emailResult.data?.id) {
      console.log(`   Message ID: ${emailResult.data.id}`);
    }

    // Display summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('\n✅ Magic Link Generation Complete!\n');
    console.log('📋 Summary:');
    console.log(`   Email to Register: ${emailToRegister}`);
    console.log(`   Magic Link Sent To: ${recipientEmail}`);
    console.log(`   Expires In: 24 hours`);
    console.log(`   Created At: ${new Date().toLocaleString()}\n`);

    console.log('🔑 Magic Token (for API testing):');
    console.log(`   ${token}\n`);

    console.log('🔗 Magic Link:');
    console.log(`   ${magicLink}\n`);

    console.log('✨ Next Steps:');
    console.log(`   1. Check email at: ${recipientEmail}`);
    console.log(`   2. Look for email from: "onboarding@resend.dev"`);
    console.log(`   3. Click the "Verify Email & Login" button`);
    console.log(`   4. You will be automatically logged in`);
    console.log(`   5. Use email "${emailToRegister}" for future logins\n`);

    console.log('💡 Manual Testing:');
    console.log(`   Open this URL in your browser to test:`);
    console.log(`   ${magicLink}\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your Resend API key is correct (starts with "re_")');
    console.error('2. Ensure you\'re sending to your registered Resend email');
    console.error('3. Free tier can only send to registered email addresses');
    console.error('4. Check your internet connection\n');
    process.exit(1);
  }
}

// Parse arguments
const emailToRegister = process.argv[2];
const recipientEmail = process.argv[3];
const apiKey = process.argv[4];

if (!emailToRegister || !recipientEmail || !apiKey) {
  console.error('\n❌ Missing required arguments\n');
  console.log('Usage:');
  console.log('  npx tsx scripts/send-magic-link-simple.ts <email-to-register> <recipient-email> <api-key>');
  console.log('\nExample:');
  console.log('  npx tsx scripts/send-magic-link-simple.ts ikmls@hotmail.com ikmal.baharudin@gmail.com re_your_key\n');
  process.exit(1);
}

sendMagicLink(emailToRegister, recipientEmail, apiKey).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
