# Authentication Architecture

**Last Updated:** 2025-10-24
**Status:** Production-Ready (Development Mode)
**Version:** 1.0.0

## Overview

The SAP GRC Platform implements a comprehensive, multi-layered authentication system with support for:
- Password-based authentication with bcrypt hashing
- Multi-Factor Authentication (TOTP & Passkeys)
- Risk-based authentication with device fingerprinting
- Session management with Redis backing  
- New login detection and confirmation

## Key Components

### Authentication Services
- **SessionManager**: Max 2 concurrent sessions per user with automatic eviction
- **DeviceFingerprint**: SHA-256 device identification from UA + IP
- **RiskAnalyzer**: 0-100 risk scoring with 6 factors
- **TOTPService**: RFC 6238 TOTP with QR codes and backup codes
- **PasskeyService**: WebAuthn/FIDO2 biometric authentication
- **NewLoginDetector**: New device/location detection with email confirmation

### Risk Factors (Total: 100 points)
- New device: 20 points
- New location: 15 points
- Recent failures: 25 points
- Velocity anomalies: 20 points
- Unusual login time (2-6 AM): 10 points
- Known malicious IPs: 10 points

### Risk Thresholds
- **0-59**: Allow login (low risk)
- **60-89**: Require email confirmation (medium/high risk)
- **90+**: Block login (critical risk)

## Database Schema

### Core Tables
- `user_sessions`: Session tracking with device info
- `user_mfa_config`: MFA settings (TOTP secrets, backup codes)
- `webauthn_credentials`: Passkey public keys
- `login_attempts`: All login attempts with risk scores
- `trusted_devices`: Devices trusted for 90 days
- `mfa_rate_limits`: Rate limiting per user/type
- `security_events`: Audit log for all auth events

### Redis Keys
- `session:{tokenHash}`: Fast session lookup
- `login:confirmation:{token}`: New device confirmations (1h TTL)
- `password:reset:{token}`: Password reset tokens (1h TTL)
- `totp:used:{userId}:{token}`: Prevent TOTP reuse (30s TTL)

## MFA Security

### TOTP
- RFC 6238 compliant, 30s window, ±1 tolerance
- Rate limit: 5 attempts / 5 minutes
- Lockout: 15 minutes after limit exceeded
- 10 single-use backup codes per user
- QR code generation for authenticator apps

### Passkeys (WebAuthn)
- FIDO2 Level 2, phishing-resistant
- Supports Face ID, Touch ID, Windows Hello, YubiKey
- Public key cryptography (ES256/RS256)
- Counter tracking prevents credential cloning
- Platform and cross-platform authenticators

## Configuration

### Required Environment Variables
```bash
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="<min 32 chars>"
ENCRYPTION_MASTER_KEY="<32-byte base64>"
WEBAUTHN_RP_ID="yourdomain.com"
WEBAUTHN_ORIGIN="https://yourdomain.com"
```

### Optional Settings
```bash
MAX_SESSIONS_PER_USER=2
RISK_CONFIRMATION_THRESHOLD=60
RISK_BLOCK_THRESHOLD=90
MFA_MAX_ATTEMPTS=5
TOTP_WINDOW=1
BCRYPT_ROUNDS=12
```

## Production Deployment

### Critical Steps
1. Set strong JWT_SECRET and ENCRYPTION_MASTER_KEY
2. Enable HTTPS/TLS for all endpoints
3. Configure PostgreSQL and Redis with SSL
4. Set up audit logging and monitoring
5. Conduct security testing (pen test, OWASP ZAP)

### Recommended
- Implement CAPTCHA for high-risk logins
- Configure IP blocklist/allowlist
- Set up log aggregation (ELK, CloudWatch)
- Enable SIEM integration
- Implement SOC2/ISO27001 controls

## Known Limitations

- No User model (uses external IdP or mock data)
- No OAuth2 refresh tokens
- No CAPTCHA integration (recommended)
- No geofencing
- No admin override for locked accounts

## References

- [RFC 6238: TOTP](https://tools.ietf.org/html/rfc6238)
- [WebAuthn Spec](https://www.w3.org/TR/webauthn-2/)
- [OWASP Auth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
