# Magic Link Email Registration Guide

This guide explains how to register an email address and send a magic link using the Resend email service.

## Overview

The platform provides a **magic link authentication** system where:
1. User registers with an email address
2. System generates a unique magic link token (valid 24 hours)
3. Magic link is sent via email
4. User clicks the link to complete registration and is automatically logged in
5. No password needed - just the email!

## Setup Instructions

### Option 1: Automated Setup (Recommended) 🚀

Run the interactive setup script:

```bash
bash setup-resend-and-register.sh
```

This script will:
1. Validate your Resend API key
2. Create the `.env` file with Resend configuration
3. Generate and send the magic link
4. Display the magic link for testing

### Option 2: Manual Setup

#### Step 1: Get Your Resend API Key

1. Visit **https://resend.com**
2. Sign up for free account (100 emails/day, 3,000/month)
3. Verify your email address
4. Go to **API Keys** → **Create API Key**
5. Set name: `SAP GRC Platform - Development`
6. Permissions: `Full access` (for development)
7. Click **Add** and copy the key (starts with `re_`)

**⚠️ Important**: For free tier, you can ONLY send emails to your registered Resend email. In this case:
- **Email to register**: ikmls@hotmail.com
- **Can send to**: ikmal.baharudin@gmail.com (your registered email)

#### Step 2: Create `.env` File

Create `packages/api/.env` (copy from `.env.example`):

```bash
cp packages/api/.env.example packages/api/.env
```

Update with your Resend API key:

```bash
# packages/api/.env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM_NAME=SAP GRC Platform
EMAIL_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3001
APP_BASE_URL=http://localhost:3001
```

#### Step 3: Register Email and Generate Magic Link

```bash
cd packages/api

# Register email and send magic link
pnpm register:magic-link ikmls@hotmail.com ikmal.baharudin@gmail.com re_your_api_key_here
```

**Without Resend API key (Test Mode)**:
```bash
# This will generate the magic link but not send an email
pnpm register:magic-link ikmls@hotmail.com ikmal.baharudin@gmail.com
```

## What Happens Next

### If Email Service is Configured:

```
📧 Email Registration & Magic Link Generator
═══════════════════════════════════════════════

📌 Registering Email: ikmls@hotmail.com
📌 Send Magic Link To: ikmal.baharudin@gmail.com
📌 Email Provider: resend

💾 Storing registration token in Redis...
✅ Token stored (expires in 24 hours)

🔗 Magic Link Generated:
   http://localhost:3001/auth/verify-registration?token=ABC123...

📧 Initializing Resend email service...
✅ Email service initialized

📨 Sending magic link email...
✅ Email sent successfully!

   Message ID: abc123def456
   Preview URL: https://resend.com/emails/...

═══════════════════════════════════════════════

✅ Registration & Magic Link Generation Complete!

📋 Summary:
   Email to Register: ikmls@hotmail.com
   Magic Link Sent To: ikmal.baharudin@gmail.com
   Expires At: [Date and Time]
   Token Validity: 24 hours

🔑 Registration Token (for testing):
   ABC123DEF456...

🔗 Magic Link:
   http://localhost:3001/auth/verify-registration?token=ABC123...

✨ Next Steps:
   1. Check your email at: ikmal.baharudin@gmail.com
   2. Click the magic link (or copy the link above in browser)
   3. You will be verified and logged in
   4. Use email: ikmls@hotmail.com to log in
```

### If Email Service is NOT Configured (Test Mode):

The magic link will still be generated and displayed in the terminal. You can:
1. Copy the magic link manually
2. Paste it in your browser
3. Complete registration without sending an email

## How to Use the Magic Link

### Option A: Click Email Link (Recommended)

1. Check your email inbox at: **ikmal.baharudin@gmail.com**
2. Look for email from: **SAP GRC Platform**
3. Click **"Verify Your Email"** or similar button
4. You will be automatically logged in as: **ikmls@hotmail.com**

### Option B: Manual Link Entry

1. Get the magic link from the script output
2. Copy the full URL
3. Paste in your browser address bar
4. Press Enter
5. You will be automatically logged in

### Option C: Frontend Registration Flow

1. Start the frontend: `cd packages/web && pnpm dev`
2. Go to http://localhost:3001/login
3. Click **"Don't have an account? Sign up"**
4. Enter: **ikmls@hotmail.com** and choose password
5. System will send magic link to registered email
6. Check email and click link to verify

## Magic Link Endpoints

### 1. Register and Request Magic Link

**Endpoint**: `POST /api/auth/register`

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ikmls@hotmail.com",
    "password": "SecurePassword123!",
    "isAdmin": false
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Registration email sent. Please verify your email to complete registration.",
  "data": {
    "email": "ikmls@hotmail.com"
  }
}
```

### 2. Verify Magic Link and Complete Registration

**Endpoint**: `POST /api/auth/verify-registration`

```bash
curl -X POST http://localhost:3000/api/auth/verify-registration \
  -H "Content-Type: application/json" \
  -d '{
    "token": "MAGIC_LINK_TOKEN_HERE"
  }'
```

**Response** (if successful):
```json
{
  "success": true,
  "message": "Registration verified. User created successfully.",
  "data": {
    "user": {
      "id": "user-ikmls-123456",
      "email": "ikmls@hotmail.com",
      "role": "USER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_123..."
  }
}
```

## Email Templates

The registration email uses the **"user-invitation"** template which includes:

- ✅ Personalized greeting
- ✅ Magic link button (big, easy to click)
- ✅ Text link (for email clients that don't support buttons)
- ✅ Expiration time (24 hours)
- ✅ Security notice
- ✅ Brand colors and styling
- ✅ Mobile responsive design

**Template variables**:
- `recipientName` - Person's name/email local part
- `invitationLink` - Full magic link URL
- `role` - User role
- `expiresIn` - Expiration time string

## Troubleshooting

### "Magic link not working"

**Check 1**: Is the link expired?
- Magic links expire after **24 hours**
- Generate a new one if needed

**Check 2**: Is the token correct?
- Ensure the full URL is copied
- Check for missing characters

**Check 3**: Is Redis running?
- Magic link tokens are stored in Redis
- Start Redis: `redis-server`

**Check 4**: Is the frontend URL correct?
- Update `FRONTEND_URL` in `.env` if your frontend is on different port
- Default: `http://localhost:3001`

### "Email not received"

**Check 1**: Is Resend API key correct?
- Verify `RESEND_API_KEY` in `.env`
- Key should start with `re_`

**Check 2**: Are you sending to the right email?
- Free tier can only send to **registered email in Resend dashboard**
- In this case: **ikmal.baharudin@gmail.com**

**Check 3**: Check spam/junk folder
- Sometimes emails end up in spam
- Add noreply@yourdomain.com to contacts

**Check 4**: Check email service logs
```bash
# View Resend email logs in dashboard
# https://resend.com/emails

# Or test email service directly
pnpm test:email ikmal.baharudin@gmail.com
```

### "Invalid email format"

- Email must have valid format: `name@domain.com`
- Both emails must be different (register email ≠ recipient email)
- Recipient email must match Resend registered email

### "Redis connection failed"

Make sure Redis is running:

```bash
# Start Redis (macOS with Homebrew)
brew services start redis

# Or using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or on Linux
sudo systemctl start redis-server
```

## Testing Locally Without Sending Real Emails

Use **test mode** for development:

```bash
# In packages/api/.env
EMAIL_PROVIDER=test

# This uses Ethereal (fake SMTP service)
# Emails won't actually send but you'll get preview URLs
```

When using test mode:
- Check the server logs for email preview URL
- No real email is sent
- Perfect for local development and testing

## Resend Free Tier Limitations

| Feature | Free Tier | Paid |
|---------|-----------|------|
| Emails per month | 3,000 | 50,000 - 500,000+ |
| Emails per day | 100 | 5,000+ |
| Sender domains | Unlimited | Unlimited |
| Recipients | Only registered email | Any email |
| Cost | Free | $20/month |

**Workaround**: Create multiple Resend accounts for testing different emails, or upgrade to paid plan.

## Next Steps

### 1. Test the Registration Flow

```bash
# Start API server
cd packages/api && pnpm dev

# In another terminal, register
pnpm register:magic-link ikmls@hotmail.com ikmal.baharudin@gmail.com re_your_key
```

### 2. Test the Frontend

```bash
# Start web server
cd packages/web && pnpm dev

# Go to http://localhost:3001/login
# Click "Sign up" and test the registration
```

### 3. Verify Email Receipt

Check **ikmal.baharudin@gmail.com** for:
- Email from: SAP GRC Platform
- Subject: "Your Magic Link - SAP GRC Platform Registration"
- Click the link to complete registration

### 4. Login With the Email

After verification, login with:
- Email: `ikmls@hotmail.com`
- Password: (whatever you set during registration)

## Security Notes

✅ **Best Practices Implemented**:
- Tokens are hashed before storage
- Tokens expire after 24 hours
- One-time use only
- IP and device tracking available
- Rate limiting on registration attempts
- Email sanitization and validation
- No passwords in logs

🔐 **Keep Secure**:
- Never commit `.env` file to git
- Rotate Resend API key regularly
- Use different keys for dev/staging/prod
- Monitor failed registration attempts
- Use environment variables, never hardcode credentials

## Support

**For Resend Issues**:
- Docs: https://resend.com/docs
- Dashboard: https://resend.com
- Support: support@resend.com

**For Platform Issues**:
- Check logs: `cd packages/api && pnpm dev`
- Verify configuration: Review `.env` file
- Run tests: `pnpm register:magic-link --help`

---

**Last Updated**: October 25, 2025
**Status**: ✅ Production Ready
**Email Service**: Resend + Redis
