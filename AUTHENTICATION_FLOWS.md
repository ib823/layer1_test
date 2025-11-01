# Complete Authentication Flows - User Experience
**SAP GRC Platform - Enhanced Multi-Factor Authentication System**

---

## 📋 TABLE OF CONTENTS

1. [Flow 1: New Tenant Onboarding](#flow-1-new-tenant-onboarding)
2. [Flow 2: First Admin Login (Post-Onboarding)](#flow-2-first-admin-login-post-onboarding)
3. [Flow 3: Regular Login - Password Only](#flow-3-regular-login---password-only)
4. [Flow 4: Login with MFA (TOTP)](#flow-4-login-with-mfa-totp)
5. [Flow 5: Login with Passkey](#flow-5-login-with-passkey)
6. [Flow 6: Passwordless Login (Passkey Only)](#flow-6-passwordless-login-passkey-only)
7. [Flow 7: New Device/Location Detection](#flow-7-new-devicelocation-detection)
8. [Flow 8: High-Risk Login (Requires MFA)](#flow-8-high-risk-login-requires-mfa)
9. [Flow 9: Max Sessions Exceeded](#flow-9-max-sessions-exceeded)
10. [Flow 10: Password Change (Revokes All Sessions)](#flow-10-password-change-revokes-all-sessions)

---

## FLOW 1: New Tenant Onboarding

**Scenario:** Company wants to use the SAP GRC Platform for the first time

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NEW TENANT ONBOARDING FLOW                       │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  1. Visit /signup      │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Fill Form:         │                            │
 │     - Company Name     │                            │
 │     - Admin Email      │                            │
 │     - Admin Name       │                            │
 │     - Password         │                            │
 │     - SAP Connection   │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  3. Validate Email Unique  │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │     ✅ Email Available     │
 │                        │                            │
 │                        │  4. Test SAP Connection    │
 │                        │    (ping S/4HANA)          │
 │                        │                            │
 │                        │  5. Create Tenant Record   │
 │                        ├───────────────────────────>│
 │                        │     tenantId: uuid()       │
 │                        │     status: ACTIVE         │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  6. Create Admin User      │
 │                        ├───────────────────────────>│
 │                        │     userId: uuid()         │
 │                        │     roles: ['admin']       │
 │                        │     passwordHash: bcrypt() │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  7. Run Service Discovery  │
 │                        │    (find available OData)  │
 │                        │                            │
 │                        │  8. Create Capability      │
 │                        │     Profile                │
 │                        ├───────────────────────────>│
 │                        │     - SoD: available       │
 │                        │     - GL Anomaly: yes      │
 │                        │     - Invoice: yes         │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  9. Send Welcome Email     │
 │                        │    Template: user-invitation
 │  <- 📧 Welcome Email! │                            │
 │    "Click to activate" │                            │
 │                        │                            │
 │  10. Success Page:     │                            │
 │      "Check email to   │                            │
 │       complete setup"  │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  11. Click Email Link  │                            │
 │      /activate?token=xx│                            │
 ├───────────────────────>│                            │
 │                        │  12. Verify Token          │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │     ✅ Valid Token         │
 │                        │                            │
 │                        │  13. Mark Email Verified   │
 │                        ├───────────────────────────>│
 │                        │     emailVerified: true    │
 │                        │<───────────────────────────┤
 │                        │                            │
 │  14. Redirect:         │                            │
 │      "/login"          │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ✅ ONBOARDING COMPLETE - READY TO LOGIN           │
 │                                                      │
 └──────────────────────────────────────────────────────┘

DATABASE STATE AFTER ONBOARDING:
┌─────────────────────────────────────────┐
│ Tenant Table:                           │
│   tenantId: "acme-corp-uuid"            │
│   companyName: "Acme Corp"              │
│   status: ACTIVE                        │
│   sapConnection: { baseUrl, auth }      │
│                                         │
│ User Table:                             │
│   userId: "admin-uuid"                  │
│   email: "admin@acme.com"               │
│   tenantId: "acme-corp-uuid"            │
│   roles: ["admin"]                      │
│   passwordHash: "$2b$12$..."           │
│   emailVerified: true                   │
│   mfaEnabled: false (not set up yet)   │
│                                         │
│ TenantCapability Table:                 │
│   tenantId: "acme-corp-uuid"            │
│   capabilities: {                       │
│     sodAnalysis: true,                  │
│     glAnomaly: true,                    │
│     invoiceMatching: true               │
│   }                                     │
└─────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Visit signup page
2. 📝 Fill out form (5 minutes)
3. ⏳ Wait for SAP connection test (10 seconds)
4. ✅ See success message
5. 📧 Check email (1 minute)
6. 🔗 Click activation link
7. ➡️ Redirected to login

**Total Time:** ~7 minutes

---

## FLOW 2: First Admin Login (Post-Onboarding)

**Scenario:** Admin logs in for the first time after onboarding

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FIRST ADMIN LOGIN FLOW                           │
│              (No MFA Set Up Yet, New Device)                        │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  1. Visit /login       │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Enter Credentials: │                            │
 │     Email: admin@acme  │                            │
 │     Password: ••••••   │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  3. Lookup User by Email   │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │    User: admin@acme.com    │
 │                        │    tenantId: acme-corp     │
 │                        │                            │
 │                        │  4. Verify Password (bcrypt)
 │                        │    ✅ Password Correct     │
 │                        │                            │
 │                        │  5. Device Fingerprinting  │
 │                        │    - Parse User-Agent      │
 │                        │    - Generate Hash         │
 │                        │    deviceId: "chrome-mac-xx"
 │                        │                            │
 │                        │  6. Get Location (GeoIP)   │
 │                        │    IP: 203.45.67.89        │
 │                        │    Location: "Kuala Lumpur"│
 │                        │                            │
 │                        │  7. Check Risk (RiskAnalyzer)
 │                        ├───────────────────────────>│
 │                        │  Query LoginAttempt table  │
 │                        │<───────────────────────────┤
 │                        │  No history → NEW USER     │
 │                        │                            │
 │                        │  Risk Score: 35 (MEDIUM)   │
 │                        │  - New Device: +20         │
 │                        │  - New Location: +15       │
 │                        │  - No Failed Attempts: +0  │
 │                        │                            │
 │                        │  8. Check MFA Status       │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │  mfaEnabled: false ❌      │
 │                        │                            │
 │                        │  💡 Decision: Allow login  │
 │                        │     but recommend MFA setup│
 │                        │                            │
 │                        │  9. Create Session         │
 │                        │    (SessionManager)        │
 │                        ├───────────────────────────>│
 │                        │  UserSession:              │
 │                        │    sessionId: uuid()       │
 │                        │    userId: admin-uuid      │
 │                        │    deviceId: chrome-mac-xx │
 │                        │    location: "KL, Malaysia"│
 │                        │    ipAddress: 203.45.67.89 │
 │                        │    createdAt: now()        │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  10. Store in Redis        │
 │                        │      (for fast lookup)     │
 │                        │                            │
 │                        │  11. Log LoginAttempt      │
 │                        ├───────────────────────────>│
 │                        │  status: SUCCESS           │
 │                        │  riskScore: 35             │
 │                        │  device: chrome-mac-xx     │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  12. Generate JWT Token    │
 │                        │      {                     │
 │                        │        userId: admin-uuid  │
 │                        │        tenantId: acme-corp │
 │                        │        sessionId: uuid     │
 │                        │        roles: ['admin']    │
 │                        │      }                     │
 │                        │                            │
 │  13. Response:         │                            │
 │      {                 │                            │
 │        token: "eyJ..." │                            │
 │        user: {...}     │                            │
 │        mfaRequired: false                           │
 │        sessionId: "uuid"                            │
 │      }                 │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  14. Redirect:         │                            │
 │      /dashboard        │                            │
 │                        │                            │
 │  ┌──────────────────────────────────────┐          │
 │  │  🎉 WELCOME TO YOUR DASHBOARD!       │          │
 │  │                                      │          │
 │  │  ⚠️  BANNER: "Secure your account!" │          │
 │  │      "Set up MFA for better security"│          │
 │  │      [Set Up MFA] button            │          │
 │  └──────────────────────────────────────┘          │
 │                        │                            │
 │  15. (Optional) Click  │                            │
 │      "Set Up MFA"      │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │      → Go to FLOW 4 (MFA Setup)                    │
 │                                                      │
 └──────────────────────────────────────────────────────┘

REDIS STATE AFTER LOGIN:
┌─────────────────────────────────────────┐
│ session:admin-uuid                      │
│   {                                     │
│     sessionId: "session-uuid",          │
│     userId: "admin-uuid",               │
│     deviceId: "chrome-mac-xx",          │
│     location: "Kuala Lumpur",           │
│     createdAt: "2025-10-23T10:00:00Z",  │
│     lastActivityAt: "2025-10-23T10:00:00Z"
│   }                                     │
└─────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Visit login page
2. ⌨️ Enter email + password
3. ⏳ Wait 1-2 seconds
4. ✅ Logged in! Redirected to dashboard
5. ⚠️ See banner: "Set up MFA" (recommended)

**Total Time:** ~30 seconds

---

## FLOW 3: Regular Login - Password Only

**Scenario:** User with NO MFA set up, logging in from trusted device

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REGULAR LOGIN - PASSWORD ONLY                    │
│                  (Trusted Device, Same Location)                    │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  1. Visit /login       │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Enter Credentials  │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  3. Verify Password ✅     │
 │                        │                            │
 │                        │  4. Device Fingerprint     │
 │                        │     deviceId: chrome-mac-xx│
 │                        │                            │
 │                        │  5. Check Device History   │
 │                        ├───────────────────────────>│
 │                        │  Query: TrustedDevice      │
 │                        │  WHERE userId = admin-uuid │
 │                        │    AND deviceId = chrome-mac
 │                        │<───────────────────────────┤
 │                        │  ✅ FOUND - Trusted Device │
 │                        │     lastUsed: 2 days ago   │
 │                        │                            │
 │                        │  6. Risk Score: 10 (LOW)   │
 │                        │     - Known Device: +0     │
 │                        │     - Same Location: +0    │
 │                        │     - No Failures: +0      │
 │                        │     - Good History: -10    │
 │                        │                            │
 │                        │  7. Check Active Sessions  │
 │                        ├───────────────────────────>│
 │                        │  Query: UserSession        │
 │                        │  WHERE userId = admin-uuid │
 │                        │    AND isActive = true     │
 │                        │<───────────────────────────┤
 │                        │  Found: 1 session (mobile) │
 │                        │  Limit: 2 max → OK ✅      │
 │                        │                            │
 │                        │  8. Create New Session     │
 │                        ├───────────────────────────>│
 │                        │  Session 2 of 2 created    │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  9. Update Trusted Device  │
 │                        ├───────────────────────────>│
 │                        │  lastUsed: now()           │
 │                        │  loginCount: +1            │
 │                        │<───────────────────────────┤
 │                        │                            │
 │  10. Login Success!    │                            │
 │      Token: "eyJ..."   │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  11. Redirect: /dashboard                          │
 │                        │                            │
 │  ✅ LOGGED IN - NO CHALLENGES!                     │
 │                                                      │
 └──────────────────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Visit login page
2. ⌨️ Enter credentials
3. ✅ Instant login (< 1 second)

**Total Time:** ~5 seconds

---

## FLOW 4: Login with MFA (TOTP)

**Scenario:** User has TOTP enabled, logging in from trusted device

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOGIN WITH MFA (TOTP)                            │
│             (User has Google Authenticator set up)                  │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  1. Visit /login       │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Enter Email/Pass   │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  3. Verify Password ✅     │
 │                        │                            │
 │                        │  4. Check MFA Status       │
 │                        ├───────────────────────────>│
 │                        │  Query: UserMFAConfig      │
 │                        │  WHERE userId = admin-uuid │
 │                        │<───────────────────────────┤
 │                        │  totpEnabled: true ✅      │
 │                        │  preferredMethod: "totp"   │
 │                        │                            │
 │  5. Show MFA Challenge │                            │
 │     Page:              │                            │
 │     ┌──────────────────────────────┐               │
 │     │  🔒 Two-Factor Authentication│               │
 │     │                              │               │
 │     │  Enter 6-digit code from     │               │
 │     │  your authenticator app:     │               │
 │     │                              │               │
 │     │  [___][___][___]-[___][___][___]            │
 │     │                              │               │
 │     │  [Verify Code]               │               │
 │     │                              │               │
 │     │  Can't access? Use backup code              │
 │     └──────────────────────────────┘               │
 │<───────────────────────┤                            │
 │                        │                            │
 │  6. Open Google Auth   │                            │
 │     on Phone 📱        │                            │
 │     Code shown: 123456 │                            │
 │                        │                            │
 │  7. Enter Code: 123456 │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  8. Get TOTP Secret        │
 │                        ├───────────────────────────>│
 │                        │  Query: UserMFAConfig      │
 │                        │<───────────────────────────┤
 │                        │  totpSecret: "BASE32..."   │
 │                        │                            │
 │                        │  9. Verify TOTP Code       │
 │                        │    (TOTPService.verify())  │
 │                        │    Input: 123456           │
 │                        │    Secret: "BASE32..."     │
 │                        │    Time window: ±1 (30s)   │
 │                        │                            │
 │                        │    ✅ CODE VALID!          │
 │                        │                            │
 │                        │  10. Check Rate Limit      │
 │                        ├───────────────────────────>│
 │                        │  Query: MFARateLimit       │
 │                        │  attempts: 1 of 5          │
 │                        │<───────────────────────────┤
 │                        │  ✅ Under limit            │
 │                        │                            │
 │                        │  11. Create Session        │
 │                        ├───────────────────────────>│
 │                        │  Session created           │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  12. Log MFA Success       │
 │                        ├───────────────────────────>│
 │                        │  SecurityEvent:            │
 │                        │    type: MFA_VERIFY_SUCCESS│
 │                        │    method: TOTP            │
 │                        │<───────────────────────────┤
 │                        │                            │
 │  13. Login Success!    │                            │
 │      Token: "eyJ..."   │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  14. Redirect: /dashboard                          │
 │                        │                            │
 │  ✅ LOGGED IN WITH MFA!                            │
 │                                                      │
 └──────────────────────────────────────────────────────┘

WRONG CODE SCENARIO:
┌─────────────────────────────────────────┐
│  User enters: 999999 (wrong code)       │
│                                         │
│  System:                                │
│  1. Verify TOTP → ❌ INVALID            │
│  2. Increment rate limit counter: 1/5   │
│  3. Log failed attempt                  │
│  4. Show error: "Invalid code"          │
│                                         │
│  After 5 failed attempts:               │
│  🔒 LOCKED for 15 minutes               │
│  Email sent: "MFA attempts locked"      │
└─────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Visit login page
2. ⌨️ Enter email + password
3. 📱 Open authenticator app on phone
4. 👀 Read 6-digit code
5. ⌨️ Enter code
6. ✅ Logged in!

**Total Time:** ~20 seconds

---

## FLOW 5: Login with Passkey

**Scenario:** User has Face ID/Touch ID set up, uses biometrics to login

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOGIN WITH PASSKEY (Face ID)                     │
│                  (After Password Verification)                      │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  1. Visit /login       │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Enter Email/Pass   │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  3. Verify Password ✅     │
 │                        │                            │
 │                        │  4. Check MFA Status       │
 │                        ├───────────────────────────>│
 │                        │  Query: UserMFAConfig      │
 │                        │<───────────────────────────┤
 │                        │  passkeyEnabled: true ✅   │
 │                        │  preferredMethod: "passkey"│
 │                        │                            │
 │  5. Show Passkey Prompt│                            │
 │     ┌──────────────────────────────┐               │
 │     │  🔑 Verify with Passkey      │               │
 │     │                              │               │
 │     │  Use Face ID, Touch ID, or   │               │
 │     │  your security key           │               │
 │     │                              │               │
 │     │  [Continue with Passkey]     │               │
 │     └──────────────────────────────┘               │
 │<───────────────────────┤                            │
 │                        │                            │
 │  6. Click "Continue"   │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  7. Get User's Passkeys    │
 │                        ├───────────────────────────>│
 │                        │  Query: WebAuthnCredential │
 │                        │  WHERE userId = admin-uuid │
 │                        │<───────────────────────────┤
 │                        │  Found: 2 passkeys         │
 │                        │    - iPhone Face ID        │
 │                        │    - MacBook Touch ID      │
 │                        │                            │
 │                        │  8. Generate Challenge     │
 │                        │    (PasskeyService)        │
 │                        │    {                       │
 │                        │      challenge: random(),  │
 │                        │      rpId: "sapgrc.com",   │
 │                        │      allowCredentials: [   │
 │                        │        { id: cred1 },      │
 │                        │        { id: cred2 }       │
 │                        │      ]                     │
 │                        │    }                       │
 │                        │                            │
 │  9. Return Challenge   │                            │
 │     to Browser         │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  10. Browser triggers  │                            │
 │      WebAuthn API:     │                            │
 │      navigator.credentials.get()                    │
 │                        │                            │
 │  ┌──────────────────────────────┐                  │
 │  │   🍎 macOS System Prompt:    │                  │
 │  │                              │                  │
 │  │   "sapgrc.com wants to       │                  │
 │  │    use your Touch ID"        │                  │
 │  │                              │                  │
 │  │   👆 [Touch Sensor to Sign In]│                  │
 │  └──────────────────────────────┘                  │
 │                        │                            │
 │  11. User touches      │                            │
 │      Touch ID sensor   │                            │
 │      👆 (biometric)    │                            │
 │                        │                            │
 │  12. System verifies   │                            │
 │      fingerprint       │                            │
 │      ✅ MATCH!         │                            │
 │                        │                            │
 │  13. Browser returns   │                            │
 │      signed response   │                            │
 ├───────────────────────>│                            │
 │      {                 │                            │
 │        credentialId: "xxx",                         │
 │        authenticatorData: "...",                    │
 │        signature: "...",                            │
 │        userHandle: "admin-uuid"                     │
 │      }                 │                            │
 │                        │                            │
 │                        │  14. Verify Signature      │
 │                        ├───────────────────────────>│
 │                        │  Get stored public key     │
 │                        │<───────────────────────────┤
 │                        │  publicKey: "..."          │
 │                        │                            │
 │                        │  15. Verify signature      │
 │                        │      with public key       │
 │                        │      ✅ VALID!             │
 │                        │                            │
 │                        │  16. Update credential     │
 │                        ├───────────────────────────>│
 │                        │  lastUsed: now()           │
 │                        │  useCount: +1              │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  17. Create Session        │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │                            │
 │  18. Login Success!    │                            │
 │      Token: "eyJ..."   │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ✅ LOGGED IN WITH FACE ID!                        │
 │     (Most secure + fastest method)                 │
 │                                                      │
 └──────────────────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Visit login page
2. ⌨️ Enter email + password
3. 🔑 Click "Continue with Passkey"
4. 👆 Touch sensor (or look at camera for Face ID)
5. ✅ Logged in!

**Total Time:** ~10 seconds (fastest method!)

---

## FLOW 6: Passwordless Login (Passkey Only)

**Scenario:** User configured passwordless login (no password required!)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PASSWORDLESS LOGIN                               │
│                  (Passkey Only - No Password!)                      │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  1. Visit /login       │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Login Page Shows:  │                            │
 │     ┌──────────────────────────────┐               │
 │     │  📧 Email                    │               │
 │     │  [admin@acme.com___________] │               │
 │     │                              │               │
 │     │  🔒 Password                 │               │
 │     │  [••••••••••••••••••••••••] │               │
 │     │                              │               │
 │     │  [Sign In]                   │               │
 │     │                              │               │
 │     │  ──────── OR ────────        │               │
 │     │                              │               │
 │     │  🔑 [Sign in with Passkey]   │               │
 │     └──────────────────────────────┘               │
 │                        │                            │
 │  3. Click "Sign in with Passkey" (skip password!)  │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  4. Generate Challenge     │
 │                        │     (no userId yet!)       │
 │                        │    {                       │
 │                        │      challenge: random(),  │
 │                        │      rpId: "sapgrc.com",   │
 │                        │      userVerification: "required"
 │                        │    }                       │
 │                        │                            │
 │  5. Return Challenge   │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  6. Browser prompts:   │                            │
 │      navigator.credentials.get()                    │
 │                        │                            │
 │  ┌──────────────────────────────┐                  │
 │  │   🍎 "sapgrc.com wants to    │                  │
 │  │       use your passkey"      │                  │
 │  │                              │                  │
 │  │   Available passkeys:        │                  │
 │  │   • admin@acme.com           │                  │
 │  │                              │                  │
 │  │   👆 [Use Touch ID]          │                  │
 │  └──────────────────────────────┘                  │
 │                        │                            │
 │  7. Touch ID Sensor 👆 │                            │
 │     ✅ Verified!        │                            │
 │                        │                            │
 │  8. Return Assertion   │                            │
 ├───────────────────────>│                            │
 │     {                  │                            │
 │       credentialId: "xxx",                          │
 │       signature: "...",                             │
 │       userHandle: "admin-uuid" ⬅️ This identifies user!
 │     }                  │                            │
 │                        │                            │
 │                        │  9. Look up credential     │
 │                        ├───────────────────────────>│
 │                        │  Query: WebAuthnCredential │
 │                        │  WHERE credentialId = "xxx"│
 │                        │<───────────────────────────┤
 │                        │  userId: "admin-uuid" ✅   │
 │                        │  publicKey: "..."          │
 │                        │                            │
 │                        │  10. Verify signature      │
 │                        │      ✅ VALID!             │
 │                        │                            │
 │                        │  11. Get user info         │
 │                        ├───────────────────────────>│
 │                        │  Query: User               │
 │                        │  WHERE id = admin-uuid     │
 │                        │<───────────────────────────┤
 │                        │  User: admin@acme.com      │
 │                        │  roles: ['admin']          │
 │                        │                            │
 │                        │  12. Create Session        │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │                            │
 │  13. Login Success!    │                            │
 │      (NO PASSWORD USED!)                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ✅ LOGGED IN - PASSWORDLESS!                      │
 │     🔒 Most secure (phishing-resistant)            │
 │     ⚡ Fastest (no typing!)                        │
 │                                                      │
 └──────────────────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Visit login page
2. 🔑 Click "Sign in with Passkey" (skip email/password!)
3. 👆 Touch sensor
4. ✅ Logged in!

**Total Time:** ~3 seconds (FASTEST!)

---

## FLOW 7: New Device/Location Detection

**Scenario:** User logs in from a new device or new location

```
┌─────────────────────────────────────────────────────────────────────┐
│                NEW DEVICE/LOCATION DETECTION                        │
│            (Triggers Email Confirmation Workflow)                   │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  1. Login from         │                            │
 │     NEW laptop in      │                            │
 │     NEW location       │                            │
 │     (e.g., Singapore)  │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Enter Credentials  │                            │
 │     Email: admin@acme  │                            │
 │     Password: ••••••   │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  3. Verify Password ✅     │
 │                        │                            │
 │                        │  4. Device Fingerprint     │
 │                        │     deviceId: firefox-win-xx│
 │                        │                            │
 │                        │  5. GeoIP Lookup           │
 │                        │     IP: 198.12.34.56       │
 │                        │     Location: Singapore    │
 │                        │                            │
 │                        │  6. Check Device History   │
 │                        ├───────────────────────────>│
 │                        │  Query: TrustedDevice      │
 │                        │  WHERE deviceId = firefox-win
 │                        │<───────────────────────────┤
 │                        │  ❌ NOT FOUND - NEW DEVICE!│
 │                        │                            │
 │                        │  7. Check Location History │
 │                        ├───────────────────────────>│
 │                        │  Query: LoginAttempt       │
 │                        │  WHERE userId = admin-uuid │
 │                        │    AND location LIKE "Singapore"
 │                        │<───────────────────────────┤
 │                        │  ❌ NEVER logged in from   │
 │                        │     Singapore before!      │
 │                        │                            │
 │                        │  8. Calculate Risk Score   │
 │                        │     (RiskAnalyzer)         │
 │                        │     - New Device: +20      │
 │                        │     - New Location: +15    │
 │                        │     - Far from home: +10   │
 │                        │     Risk: 45 (MEDIUM-HIGH) │
 │                        │                            │
 │                        │  🚨 DECISION: Require      │
 │                        │     email confirmation!    │
 │                        │                            │
 │                        │  9. Create Confirmation    │
 │                        │     Token (expires 1hr)    │
 │                        ├───────────────────────────>│
 │                        │  PendingConfirmation:      │
 │                        │    token: uuid()           │
 │                        │    userId: admin-uuid      │
 │                        │    deviceId: firefox-win-xx│
 │                        │    location: Singapore     │
 │                        │    expiresAt: now() + 1hr  │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  10. Send Email            │
 │                        │      (NewLoginDetector)    │
 │                        │      Template: new-login-confirmation
 │  📧 Email Received:    │                            │
 │     ┌────────────────────────────────┐             │
 │     │ 🔒 New Login Detected          │             │
 │     │                                │             │
 │     │ We detected a login from a    │             │
 │     │ device we don't recognize:    │             │
 │     │                                │             │
 │     │ Device: Firefox on Windows    │             │
 │     │ Location: Singapore           │             │
 │     │ IP: 198.12.34.56              │             │
 │     │ Time: Oct 23, 2025 10:30 AM   │             │
 │     │                                │             │
 │     │ Was this you?                 │             │
 │     │                                │             │
 │     │ [✅ Yes, it was me]            │             │
 │     │ [❌ No, deny this login]       │             │
 │     │                                │             │
 │     │ This link expires in 1 hour.  │             │
 │     └────────────────────────────────┘             │
 │                        │                            │
 │  11. Show Pending Page │                            │
 │      ┌────────────────────────────────┐            │
 │      │ 📧 Email Verification Required │            │
 │      │                                │            │
 │      │ For your security, we sent a  │            │
 │      │ verification email to:        │            │
 │      │ admin@acme.com                │            │
 │      │                                │            │
 │      │ Please check your email and   │            │
 │      │ click the confirmation link.  │            │
 │      │                                │            │
 │      │ ⏰ Link expires in: 59:30     │            │
 │      └────────────────────────────────┘            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ⏳ User waits for email (1-2 minutes)             │
 │                        │                            │
 │  12. Click "Yes, it    │                            │
 │      was me" in email  │                            │
 ├───────────────────────>│                            │
 │      GET /auth/confirm-login?token=xxx             │
 │                        │                            │
 │                        │  13. Verify Token          │
 │                        ├───────────────────────────>│
 │                        │  Query: PendingConfirmation│
 │                        │  WHERE token = xxx         │
 │                        │<───────────────────────────┤
 │                        │  ✅ Valid, not expired     │
 │                        │                            │
 │                        │  14. Add to Trusted Devices│
 │                        ├───────────────────────────>│
 │                        │  TrustedDevice:            │
 │                        │    deviceId: firefox-win-xx│
 │                        │    userId: admin-uuid      │
 │                        │    trustedAt: now()        │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  15. Create Session        │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  16. Delete Pending Token  │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │                            │
 │  17. Success Page:     │                            │
 │      "Device confirmed!"│                           │
 │      Redirect to /dashboard in 3s                  │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ✅ LOGGED IN! Device now trusted.                 │
 │     Future logins from this device: no confirmation│
 │                                                      │
 └──────────────────────────────────────────────────────┘

USER DENIES LOGIN:
┌─────────────────────────────────────────┐
│  User clicks: "No, deny this login"     │
│                                         │
│  System:                                │
│  1. Delete pending confirmation ❌      │
│  2. Log security event (DENIED_LOGIN)   │
│  3. Force password reset                │
│  4. Revoke ALL active sessions          │
│  5. Send email: "Your password was reset"
│  6. Add IP to suspicious list           │
│                                         │
│  🔒 Account secured!                    │
└─────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Login from new device/location
2. ⌨️ Enter credentials
3. ⏳ See "Check your email" message
4. 📧 Open email (1-2 min wait)
5. ✅ Click "Yes, it was me"
6. ✅ Device trusted, logged in!

**Total Time:** ~3 minutes (one-time setup for new device)

---

## FLOW 8: High-Risk Login (Requires MFA)

**Scenario:** System detects high-risk behavior, forces MFA even if not enabled

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HIGH-RISK LOGIN DETECTION                        │
│           (Forces MFA even if user hasn't set it up)                │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  1. Login with:        │                            │
 │     - VPN IP           │                            │
 │     - New device       │                            │
 │     - After 3 failed   │                            │
 │       attempts today   │                            │
 │     - At 3 AM (unusual)│                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Verify Password ✅ │                            │
 │                        │                            │
 │                        │  3. Risk Analysis:         │
 │                        │     New Device: +20        │
 │                        │     New Location: +15      │
 │                        │     Recent Failures: +25   │
 │                        │     Unusual Time: +10      │
 │                        │     VPN/Proxy: +10         │
 │                        │     ───────────────        │
 │                        │     TOTAL: 80 (HIGH RISK!) │
 │                        │                            │
 │                        │  4. Check MFA Status       │
 │                        ├───────────────────────────>│
 │                        │<───────────────────────────┤
 │                        │  mfaEnabled: false ❌      │
 │                        │                            │
 │                        │  🚨 DECISION: Force MFA    │
 │                        │     even though not set up!│
 │                        │                            │
 │                        │  5. Send OTP via Email     │
 │  📧 Email:             │                            │
 │     "Your verification code: 739284"               │
 │     "Valid for 10 minutes"                         │
 │                        │                            │
 │  6. Show Challenge:    │                            │
 │     ┌──────────────────────────────┐               │
 │     │ ⚠️  High-Risk Login Detected │               │
 │     │                              │               │
 │     │ For your security, we need   │               │
 │     │ to verify your identity.     │               │
 │     │                              │               │
 │     │ We sent a 6-digit code to:   │               │
 │     │ ad***@acme.com               │               │
 │     │                              │               │
 │     │ Enter code: [______]         │               │
 │     │                              │               │
 │     │ [Verify]                     │               │
 │     │                              │               │
 │     │ Didn't receive? [Resend]     │               │
 │     └──────────────────────────────┘               │
 │<───────────────────────┤                            │
 │                        │                            │
 │  7. Check email 📧     │                            │
 │     Code: 739284       │                            │
 │                        │                            │
 │  8. Enter Code         │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  9. Verify OTP ✅          │
 │                        │                            │
 │                        │  10. Show Recommendation   │
 │      ┌────────────────────────────────┐            │
 │      │ ✅ Login Successful            │            │
 │      │                                │            │
 │      │ ⚠️  Important Security Notice  │            │
 │      │                                │            │
 │      │ We detected unusual activity.  │            │
 │      │ To protect your account, we    │            │
 │      │ strongly recommend setting up  │            │
 │      │ two-factor authentication.     │            │
 │      │                                │            │
 │      │ [Set Up MFA Now] [Skip]        │            │
 │      └────────────────────────────────┘            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ✅ LOGGED IN (but encouraged to set up MFA)       │
 │                                                      │
 └──────────────────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Login in unusual circumstances
2. ⌨️ Enter credentials
3. ⚠️ See "High-risk detected" message
4. 📧 Check email for OTP code
5. ⌨️ Enter code
6. ✅ Logged in (with MFA recommendation)

**Total Time:** ~2 minutes

---

## FLOW 9: Max Sessions Exceeded

**Scenario:** User tries to login but already has 2 active sessions

```
┌─────────────────────────────────────────────────────────────────────┐
│                MAX SESSIONS EXCEEDED (2/2)                          │
│            (Oldest Session Automatically Evicted)                   │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  Current Sessions:     │                            │
 │  1. Mobile (3 days old)│                            │
 │  2. Work PC (1 day old)│                            │
 │                        │                            │
 │  Now: Login from       │                            │
 │       Home Laptop      │                            │
 │                        │                            │
 │  1. Enter Credentials  │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  2. Verify Password ✅     │
 │                        │                            │
 │                        │  3. Check Active Sessions  │
 │                        ├───────────────────────────>│
 │                        │  Query: UserSession        │
 │                        │  WHERE userId = admin-uuid │
 │                        │    AND isActive = true     │
 │                        │<───────────────────────────┤
 │                        │  Found: 2 sessions ⚠️      │
 │                        │  - Mobile: 3 days old      │
 │                        │  - Work PC: 1 day old      │
 │                        │                            │
 │                        │  4. Find Oldest Session    │
 │                        │     Oldest: Mobile (3 days)│
 │                        │                            │
 │                        │  5. Revoke Mobile Session  │
 │                        ├───────────────────────────>│
 │                        │  UPDATE UserSession        │
 │                        │  SET isActive = false      │
 │                        │  WHERE id = mobile-session │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  6. Delete from Redis      │
 │                        │     (mobile session)       │
 │                        │                            │
 │                        │  7. Create New Session     │
 │                        ├───────────────────────────>│
 │                        │  Laptop session created    │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  8. Send Email Notification│
 │  📧 To Mobile:         │                            │
 │     "Your session was logged out"                  │
 │     "New login from: Home Laptop"                  │
 │     "If this wasn't you, secure your account"      │
 │                        │                            │
 │  9. Show Notice:       │                            │
 │     ┌────────────────────────────────┐             │
 │     │ ✅ Login Successful            │             │
 │     │                                │             │
 │     │ ℹ️  Session Limit Notice       │             │
 │     │                                │             │
 │     │ You can only have 2 active     │             │
 │     │ sessions. Your oldest session  │             │
 │     │ (Mobile, 3 days ago) was       │             │
 │     │ automatically logged out.      │             │
 │     │                                │             │
 │     │ [View All Sessions]            │             │
 │     └────────────────────────────────┘             │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ✅ LOGGED IN!         │                            │
 │     Active sessions:   │                            │
 │     1. Work PC         │                            │
 │     2. Home Laptop (current)                       │
 │                                                      │
 └──────────────────────────────────────────────────────┘

CURRENT SESSION STATE:
┌─────────────────────────────────────────┐
│ Active Sessions (2/2):                  │
│                                         │
│ 1️⃣  Work PC                            │
│     Last active: 1 day ago              │
│     Location: Office, KL                │
│     [Revoke]                            │
│                                         │
│ 2️⃣  Home Laptop (current) 🟢          │
│     Last active: just now               │
│     Location: Home, KL                  │
│     This device                         │
│                                         │
│ ❌ Mobile (logged out)                  │
│     Was active: 3 days ago              │
│     Reason: Session limit exceeded      │
└─────────────────────────────────────────┘
```

**User Experience:**
1. 🌐 Login from 3rd device
2. ⌨️ Enter credentials
3. ✅ Logged in immediately
4. ℹ️ See notice: "Oldest session logged out"
5. 📧 (Optional) Check email notification

**Total Time:** ~5 seconds

---

## FLOW 10: Password Change (Revokes All Sessions)

**Scenario:** User changes password, all sessions are revoked for security

```
┌─────────────────────────────────────────────────────────────────────┐
│              PASSWORD CHANGE → REVOKE ALL SESSIONS                  │
│                  (Security Best Practice)                           │
└─────────────────────────────────────────────────────────────────────┘

USER                    SYSTEM                      DATABASE
 │                        │                            │
 │  Currently logged in   │                            │
 │  on 2 devices          │                            │
 │                        │                            │
 │  1. Go to Settings >   │                            │
 │     Security > Change  │                            │
 │     Password           │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │  2. Fill Form:         │                            │
 │     Current: ••••••    │                            │
 │     New: ••••••••      │                            │
 │     Confirm: ••••••••  │                            │
 ├───────────────────────>│                            │
 │                        │                            │
 │                        │  3. Verify Current Password│
 │                        ├───────────────────────────>│
 │                        │  bcrypt.compare()          │
 │                        │  ✅ Correct                │
 │                        │                            │
 │                        │  4. Hash New Password      │
 │                        │     newHash = bcrypt()     │
 │                        │                            │
 │                        │  5. Update Password        │
 │                        ├───────────────────────────>│
 │                        │  UPDATE User               │
 │                        │  SET passwordHash = newHash│
 │                        │  WHERE id = admin-uuid     │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  6. Get All Active Sessions│
 │                        ├───────────────────────────>│
 │                        │  Query: UserSession        │
 │                        │  WHERE userId = admin-uuid │
 │                        │    AND isActive = true     │
 │                        │<───────────────────────────┤
 │                        │  Found: 2 sessions         │
 │                        │  - Laptop (current)        │
 │                        │  - Mobile                  │
 │                        │                            │
 │                        │  7. Revoke ALL Sessions    │
 │                        ├───────────────────────────>│
 │                        │  UPDATE UserSession        │
 │                        │  SET isActive = false      │
 │                        │  WHERE userId = admin-uuid │
 │                        │<───────────────────────────┤
 │                        │  ✅ 2 sessions revoked     │
 │                        │                            │
 │                        │  8. Delete from Redis      │
 │                        │     (all sessions)         │
 │                        │                            │
 │                        │  9. Log Security Event     │
 │                        ├───────────────────────────>│
 │                        │  SecurityEvent:            │
 │                        │    type: PASSWORD_CHANGED  │
 │                        │    sessionsRevoked: 2      │
 │                        │<───────────────────────────┤
 │                        │                            │
 │                        │  10. Send Email to User    │
 │  📧 Email:             │                            │
 │     ┌────────────────────────────────┐             │
 │     │ 🔒 Password Changed            │             │
 │     │                                │             │
 │     │ Your password was successfully │             │
 │     │ changed at:                    │             │
 │     │ Oct 23, 2025 2:30 PM           │             │
 │     │                                │             │
 │     │ For security, all your active  │             │
 │     │ sessions (2) have been logged  │             │
 │     │ out. Please login again.       │             │
 │     │                                │             │
 │     │ If you didn't make this change,│             │
 │     │ contact support immediately.   │             │
 │     └────────────────────────────────┘             │
 │                        │                            │
 │  11. Show Success:     │                            │
 │      ┌────────────────────────────────┐            │
 │      │ ✅ Password Changed            │            │
 │      │                                │            │
 │      │ Your password has been updated.│            │
 │      │                                │            │
 │      │ ⚠️  For your security, all     │            │
 │      │     active sessions have been  │            │
 │      │     logged out.                │            │
 │      │                                │            │
 │      │ You will be redirected to      │            │
 │      │ login in 5 seconds...          │            │
 │      └────────────────────────────────┘            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ⏳ After 5 seconds...                              │
 │                        │                            │
 │  12. Redirect: /login  │                            │
 │<───────────────────────┤                            │
 │                        │                            │
 │  ───────────────────────────────────────────────   │
 │  📱 MOBILE DEVICE:                                  │
 │     Next API request returns:                      │
 │     401 Unauthorized                               │
 │     "Session expired, please login again"          │
 │  ───────────────────────────────────────────────   │
 │                        │                            │
 │  ✅ ALL DEVICES LOGGED OUT FOR SECURITY            │
 │                                                      │
 └──────────────────────────────────────────────────────┘
```

**User Experience:**
1. ⚙️ Go to security settings
2. 🔒 Enter current + new password
3. ✅ See success message
4. ⏳ Wait 5 seconds
5. ➡️ Redirected to login
6. 🔑 Login with new password

**Total Time:** ~1 minute

---

## 📊 SUMMARY COMPARISON

| Flow | Security Level | User Effort | Time | Frequency |
|------|----------------|-------------|------|-----------|
| **1. Onboarding** | ⭐⭐ Medium | High | ~7 min | Once |
| **2. First Login** | ⭐⭐⭐ Medium-High | Medium | ~30 sec | Once |
| **3. Password Only** | ⭐⭐ Medium | Low | ~5 sec | Daily |
| **4. Password + TOTP** | ⭐⭐⭐⭐ High | Medium | ~20 sec | Daily |
| **5. Password + Passkey** | ⭐⭐⭐⭐⭐ Highest | Low | ~10 sec | Daily |
| **6. Passwordless** | ⭐⭐⭐⭐⭐ Highest | Lowest | ~3 sec | Daily |
| **7. New Device** | ⭐⭐⭐⭐ High | Medium | ~3 min | Per device |
| **8. High-Risk** | ⭐⭐⭐⭐ High | Medium | ~2 min | Rare |
| **9. Max Sessions** | ⭐⭐⭐ Medium | None | ~5 sec | Occasional |
| **10. Password Change** | ⭐⭐⭐⭐ High | Medium | ~1 min | Rare |

---

## 🎯 RECOMMENDED USER JOURNEY

**For Best Security + UX:**

```
Day 1: Onboarding (7 min, one-time)
  ↓
Day 1: First Login (30 sec)
  ↓
Day 1: Set up Passkey (2 min, one-time)
  ↓
Day 2+: Passwordless Login (3 sec, daily)
  ✅ FASTEST + MOST SECURE!
```

**Alternative (if passkeys not available):**

```
Day 1: Onboarding
  ↓
Day 1: Set up TOTP (3 min, one-time)
  ↓
Day 2+: Password + TOTP (20 sec, daily)
  ✅ SECURE + REASONABLE
```

---

## 💡 KEY INSIGHTS

1. **Passwordless is fastest** (3 sec) and most secure (phishing-resistant)
2. **New device confirmation** adds friction (3 min) but prevents account takeover
3. **Max 2 sessions** is transparent to users (auto-eviction)
4. **Risk-based auth** adapts security to threat level
5. **Password change → logout all** is critical security measure

---

**This flow documentation should be shared with:**
- ✅ Product team (UX decisions)
- ✅ Security team (risk analysis)
- ✅ Support team (user questions)
- ✅ Developers (implementation guide)
