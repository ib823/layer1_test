# Quick Start: Magic Link Registration

## 📋 What You Need

1. **Resend API Key** (starts with `re_`)
   - Get it from: https://resend.com/api-keys
   - Free tier: 100 emails/day, 3,000/month
   - Can only send to: **ikmal.baharudin@gmail.com** (your registered email)

2. **Your Details**:
   - Email to register: **ikmls@hotmail.com**
   - Send magic link to: **ikmal.baharudin@gmail.com**
   - App running on: **http://localhost:3001** (frontend) and **http://localhost:3000** (API)

## 🚀 Quick Setup (30 seconds)

### Step 1: Run the Setup Script

```bash
bash setup-resend-and-register.sh
```

The script will:
- Ask for your Resend API key
- Create `.env` file
- Register the email
- Generate and send magic link
- Display the magic link for testing

### Step 2: (Manual Alternative)

If you prefer to run commands manually:

```bash
# Create .env file
cp packages/api/.env.example packages/api/.env

# Edit .env and update:
# RESEND_API_KEY=re_your_api_key_here
nano packages/api/.env

# Register email and send magic link
cd packages/api
pnpm register:magic-link ikmls@hotmail.com ikmal.baharudin@gmail.com re_your_api_key_here
```

## 📧 Expected Output

```
📧 Email Registration & Magic Link Generator
═══════════════════════════════════════════════

📌 Registering Email: ikmls@hotmail.com
📌 Send Magic Link To: ikmal.baharudin@gmail.com
📌 Email Provider: resend

💾 Storing registration token in Redis...
✅ Token stored (expires in 24 hours)

🔗 Magic Link Generated:
   http://localhost:3001/auth/verify-registration?token=eyJhbGc...

📧 Initializing Resend email service...
✅ Email service initialized

📨 Sending magic link email...
✅ Email sent successfully!
   Message ID: abc123def456

═══════════════════════════════════════════════

✅ Registration & Magic Link Generation Complete!

🔑 Registration Token:
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

🔗 Magic Link:
   http://localhost:3001/auth/verify-registration?token=eyJ...

✨ Next Steps:
   1. Check your email at: ikmal.baharudin@gmail.com
   2. Click the magic link in the email
   3. You will be verified and logged in
   4. Use email: ikmls@hotmail.com to log in
```

## ✅ What Happens Next

### Option 1: Click Email Link (Recommended)

1. ✉️ Check inbox at: **ikmal.baharudin@gmail.com**
2. 👁️ Look for email from: **"SAP GRC Platform"**
3. 🔗 Click the **magic link** or **"Verify Your Email"** button
4. ✨ You're automatically logged in as: **ikmls@hotmail.com**
5. 🎉 Done! No password needed!

### Option 2: Test Link Manually

If you want to test without waiting for email:

```bash
# Copy the magic link from script output
# Paste in browser address bar
http://localhost:3001/auth/verify-registration?token=eyJhbGc...
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **API key not found** | Paste your full Resend API key (starts with `re_`) |
| **Email not received** | Check spam/junk folder or verify you're sending to: ikmal.baharudin@gmail.com |
| **Redis connection failed** | Start Redis: `brew services start redis` or `docker run -d -p 6379:6379 redis:7-alpine` |
| **Script not executable** | Run: `chmod +x setup-resend-and-register.sh` |
| **pnpm command not found** | Install pnpm: `npm install -g pnpm` |

## 📚 Learn More

- **Full Guide**: See `MAGIC_LINK_REGISTRATION.md`
- **Resend Docs**: https://resend.com/docs
- **Free Tier Details**: https://resend.com/pricing

## 🎯 Success Criteria

✅ Magic link sent to: **ikmal.baharudin@gmail.com**
✅ Link works when clicked
✅ User logged in as: **ikmls@hotmail.com**
✅ Token expires after 24 hours

---

**Ready?** Run:
```bash
bash setup-resend-and-register.sh
```

When prompted, enter your Resend API key and you're all set! 🚀
