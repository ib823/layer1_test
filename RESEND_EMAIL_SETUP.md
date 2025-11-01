# Resend Email Setup Guide

This guide explains how to configure email delivery using Resend for the SAP GRC Platform authentication system.

## 📧 Overview

The platform supports three email providers:
- **Resend** (recommended) - Modern email API with generous free tier
- **SMTP** - Traditional email via any SMTP server
- **Test** - Development mode using Ethereal (fake emails for testing)

## 🚀 Quick Start with Resend

### 1. Sign Up for Resend

1. Visit https://resend.com
2. Click "Start Building" or "Sign Up"
3. Create an account (free tier includes 3,000 emails/month)
4. Verify your email address

### 2. Get Your API Key

1. Log in to Resend Dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "SAP GRC Platform - Development")
5. Set permissions:
   - **Sending access**: `Full access` (for production)
   - Or `Sending from specific domain` (more secure)
6. Click **Add**
7. **Copy the API key** (starts with `re_`)
   - ⚠️ You can only see it once!

### 3. Verify Your Domain (Required for Production)

**For Testing/Development**: Skip this step - you can send emails using Resend's test domain

**For Production**: You must verify your domain

1. In Resend Dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the provided DNS records to your domain:
   - **SPF record** (TXT)
   - **DKIM records** (TXT)
   - **MX record** (optional, for receiving bounces)
5. Wait for verification (usually < 5 minutes)
6. Status will change to ✅ **Verified**

### 4. Configure Environment Variables

Update your `.env` file:

```bash
# Email provider - set to 'resend'
EMAIL_PROVIDER=resend

# Your Resend API key
RESEND_API_KEY=re_your_api_key_here

# From address (MUST use verified domain in production)
EMAIL_FROM_NAME=SAP GRC Platform
EMAIL_FROM_EMAIL=noreply@yourdomain.com

# Frontend base URL (for email links like password reset, login confirmation)
APP_BASE_URL=https://yourdomain.com
```

### 5. Test Email Delivery

Start the API server:

```bash
cd packages/api
pnpm dev
```

You should see:
```
📧 Initializing email service...
📧 Email service initialized with provider: resend
```

Test with password reset:

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@yourdomain.com"}'
```

Check your inbox for the password reset email!

## 📊 Email Templates Available

The platform includes the following email templates:

1. **password-reset** - Password reset link
2. **password-reset-confirmation** - Password changed confirmation
3. **new-login-confirmation** - New device/location login verification
4. **login-denied-notification** - Security alert for denied logins
5. **mfa-enabled** - MFA activation confirmation
6. **mfa-disabled** - MFA deactivation notice
7. **passkey-registered** - Passkey registration confirmation
8. **user-invitation** - Invite user to platform
9. **violation-alert** - SoD violation notifications
10. **report-delivery** - Scheduled report delivery
11. **access-review-reminder** - Access review reminders

All templates are fully styled with MJML and responsive.

## 🔧 Advanced Configuration

### Using Custom SMTP (Alternative to Resend)

If you prefer to use your own SMTP server:

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Test Mode (Development)

For local development without sending real emails:

```bash
EMAIL_PROVIDER=test
```

This uses Ethereal (https://ethereal.email) - a fake SMTP service. Emails are captured and you'll see preview URLs in the logs.

### Environment-Specific Configuration

**Development** (.env.local):
```bash
EMAIL_PROVIDER=test
EMAIL_FROM_EMAIL=noreply@localhost
APP_BASE_URL=http://localhost:3001
```

**Staging** (.env.staging):
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_staging_key
EMAIL_FROM_EMAIL=noreply@staging.yourdomain.com
APP_BASE_URL=https://staging.yourdomain.com
```

**Production** (.env.production):
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_production_key
EMAIL_FROM_EMAIL=noreply@yourdomain.com
APP_BASE_URL=https://yourdomain.com
```

## 📈 Resend Free Tier Limits

- **3,000 emails per month**
- **100 emails per day**
- **Unlimited domains**
- **Email analytics & logs**
- **Webhook support**

Paid plans start at $20/month for 50,000 emails.

## 🔐 Security Best Practices

### 1. API Key Security
- ✅ Never commit API keys to git
- ✅ Use environment variables
- ✅ Rotate keys periodically
- ✅ Use separate keys for dev/staging/prod
- ✅ Revoke unused keys immediately

### 2. Domain Verification
- ✅ Always verify domains in production
- ✅ Use separate subdomains for environments
  - Dev: `dev.yourdomain.com`
  - Staging: `staging.yourdomain.com`
  - Production: `yourdomain.com`

### 3. Email Content Security
- ✅ All templates sanitize user input
- ✅ Links include expiring tokens
- ✅ Emails include security context (IP, device)

## 🐛 Troubleshooting

### Email Not Sending

**Check 1**: Verify API key is correct
```bash
# Test API key
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"onboarding@resend.dev","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

**Check 2**: Verify environment variables are loaded
```bash
# In packages/api
node -e "require('dotenv').config(); console.log(process.env.RESEND_API_KEY)"
```

**Check 3**: Check server logs
```bash
# Look for:
📧 Email service initialized with provider: resend
# Or errors like:
Failed to initialize email service
```

### Domain Not Verified

1. Check DNS records are correctly added
2. Use a DNS checker: https://mxtoolbox.com/SuperTool.aspx
3. Wait 5-10 minutes for DNS propagation
4. Contact Resend support if stuck

### Rate Limit Exceeded

Free tier limits:
- **Daily**: 100 emails
- **Monthly**: 3,000 emails

**Solutions**:
- Wait 24 hours for daily limit reset
- Upgrade to paid plan
- Use test mode for development

### Email Goes to Spam

**Solutions**:
1. Verify SPF, DKIM, and DMARC records
2. Use a verified domain (not @gmail.com or @yahoo.com)
3. Warm up your domain (gradually increase sending volume)
4. Use proper "From" address (noreply@yourdomain.com)
5. Include unsubscribe links (for marketing emails)

## 📚 Additional Resources

- **Resend Documentation**: https://resend.com/docs
- **Resend API Reference**: https://resend.com/docs/api-reference/emails/send-email
- **Email Best Practices**: https://resend.com/docs/knowledge-base/best-practices
- **Template Testing**: Use https://mjml.io/try-it-live to preview MJML templates

## 🆘 Support

**Resend Issues**:
- Email: support@resend.com
- Discord: https://resend.com/discord

**Platform Issues**:
- GitHub: https://github.com/your-repo/issues
- Email: support@yourdomain.com

---

**Last Updated**: 2025-10-23
**Resend SDK Version**: 6.2.2
**Status**: ✅ Production Ready
