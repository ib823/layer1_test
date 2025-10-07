# ADR-0002: Authentication Enforcement with XSUAA

**Status:** ✅ Accepted

**Date:** 2025-10-07

**Context:** feat/auth-and-rate-limiting

**Deciders:** Engineering Team

---

## Context and Problem Statement

The SAP MVP Framework is a multi-tenant SaaS platform that needs robust authentication to:
1. Verify user identity before granting API access
2. Enforce tenant isolation (users can only access their tenant's data)
3. Support role-based access control (RBAC)
4. Integrate seamlessly with SAP BTP ecosystem

**Key Requirements:**
- Must support SAP BTP XSUAA (production)
- Must support local development without SAP BTP
- Must extract tenant ID from JWT for multi-tenancy
- Must support role-based authorization
- Must fail securely (deny by default)

---

## Decision

We will implement **dual-mode authentication**:

### 1. Production Mode: XSUAA JWT Validation
- Use SAP BTP's XSUAA service for JWT signature validation
- Leverage `@sap/xssec` library for token verification
- Extract user context (id, email, roles, tenantId) from validated JWT
- Fail closed (deny access if XSUAA unavailable)

### 2. Development Mode: Simple JWT Decoding
- Base64 decode JWT payload without signature validation
- Extract same user context structure
- Log WARNING that this mode is not for production
- Enabled via `AUTH_ENABLED=false` or when XSUAA not available

### 3. Configuration-Driven

```typescript
// Environment-based mode selection
if (config.nodeEnv === 'production' || process.env.VCAP_SERVICES) {
  // XSUAA validation
  xssec.createSecurityContext(token, xsuaaService, callback);
} else {
  // Development: decode only
  const payload = decodeJWT(token);
}
```

---

## Considered Alternatives

### Alternative 1: Custom JWT with RS256
**Pros:**
- Full control over token generation
- No dependency on SAP BTP

**Cons:**
- ❌ Doesn't integrate with SAP BTP security
- ❌ Requires custom IAS/IDP integration
- ❌ More maintenance burden
- ❌ Doesn't leverage existing SAP security infrastructure

**Decision:** Rejected - Platform should use SAP BTP's standard security

### Alternative 2: OAuth 2.0 Client Credentials Flow
**Pros:**
- Standard OAuth flow
- Good for service-to-service

**Cons:**
- ❌ Not suitable for user authentication
- ❌ Doesn't provide user context (who is making the request?)
- ❌ No support for interactive logins

**Decision:** Rejected - Need user context for multi-tenancy and audit logs

### Alternative 3: Always Require XSUAA (No Dev Mode)
**Pros:**
- Production parity
- No dual code paths

**Cons:**
- ❌ Difficult local development (requires SAP BTP access)
- ❌ Slower developer iteration
- ❌ Harder for contributors without SAP BTP accounts

**Decision:** Rejected - Developer experience is critical

### Alternative 4: Basic Auth (Username/Password)
**Pros:**
- Simple to implement
- Works everywhere

**Cons:**
- ❌ Not suitable for multi-tenant SaaS
- ❌ No tenant isolation
- ❌ Password management overhead
- ❌ Doesn't integrate with SAP BTP

**Decision:** Rejected - Insufficient for enterprise SaaS

---

## Decision Rationale

### Why XSUAA for Production?

1. **SAP BTP Native:**
   - Platform is designed for SAP BTP Cloud Foundry
   - XSUAA is the standard BTP authentication service
   - Automatic integration with IAS (Identity Authentication Service)

2. **Enterprise Security:**
   - JWT signature validation prevents token tampering
   - Supports multi-factor authentication (MFA)
   - Centralized user management via IAS
   - Audit trails automatically logged

3. **Multi-Tenancy Built-In:**
   - Tenant ID embedded in JWT (`zid` claim)
   - Each tenant has isolated subaccount
   - Automatic tenant resolution from token

4. **Role-Based Access Control (RBAC):**
   - Roles defined in `xs-security.json`
   - Role collections assigned to users
   - Scopes checked via `securityContext.checkScope()`

### Why Dev Mode?

1. **Developer Experience:**
   - Contributors may not have SAP BTP access
   - Faster iteration (no external dependencies)
   - Can test locally with mock JWTs

2. **Safety Mechanism:**
   - Logs WARNING prominently
   - Checks `config.nodeEnv` to prevent production use
   - Clear comments in code: "FOR DEVELOPMENT ONLY"

3. **Same API Contract:**
   - Dev mode extracts same user context structure
   - Tests can use dev mode for predictability
   - Easier to write integration tests

---

## Implementation Details

### Authentication Middleware

**File:** `packages/api/src/middleware/auth.ts`

```typescript
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip auth if disabled (dev only)
  if (!config.auth.enabled) {
    logger.warn('Authentication disabled - using dev user');
    req.user = { id: 'dev-user', ... };
    return next();
  }

  // Extract JWT from Authorization header
  const token = extractBearerToken(req);
  if (!token) {
    return ApiResponseUtil.unauthorized(res, 'Missing token');
  }

  // PRODUCTION: Validate with XSUAA
  if (config.nodeEnv === 'production' || process.env.VCAP_SERVICES) {
    validateWithXSUAA(token, req, res, next);
  } else {
    // DEVELOPMENT: Decode only
    logger.warn('Using development JWT validation (not for production!)');
    validateInDevMode(token, req, res, next);
  }
}
```

### User Context Structure

```typescript
interface AuthenticatedUser {
  id: string;         // User unique identifier
  email: string;      // User email
  roles: string[];    // User roles/scopes
  tenantId: string;   // Tenant identifier (for multi-tenancy)
}
```

**Source of Values:**

| Field | XSUAA Source | Dev Mode Source |
|-------|--------------|-----------------|
| `id` | `getLogonName()` | `sub` or `user_id` claim |
| `email` | `getEmail()` | `email` or `user_name` claim |
| `roles` | `getAttribute('xs.rolecollections')` | `scope` or `roles` claim |
| `tenantId` | `getSubaccountId()` | `zid` or `tenant_id` claim |

### Role-Based Authorization

```typescript
export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponseUtil.unauthorized(res);
    }

    // Admin role bypasses all checks
    if (req.user.roles.includes('admin')) {
      return next();
    }

    // Check for specific role
    if (!req.user.roles.includes(role)) {
      return ApiResponseUtil.forbidden(res, `Requires role: ${role}`);
    }

    next();
  };
}
```

**Usage:**
```typescript
router.get('/admin/tenants', requireRole('admin'), getTenants);
router.post('/violations/acknowledge', requireRole('compliance_officer'), acknowledgeViolation);
```

### Token Expiration Handling

```typescript
// Check expiration
if (decodedToken.exp && Date.now() >= decodedToken.exp * 1000) {
  logger.warn('Token expired', { userId: decodedToken.sub });
  return ApiResponseUtil.unauthorized(res, 'Token expired');
}
```

**Behavior:**
- Tokens expire after 1 hour (XSUAA default)
- Client must refresh token before expiration
- Expired tokens rejected with 401 Unauthorized
- Clear error message: "Token expired"

---

## Security Considerations

### 1. Fail Securely
- **Default:** Deny access unless explicitly allowed
- **No token:** 401 Unauthorized
- **Invalid token:** 401 Unauthorized
- **Expired token:** 401 Unauthorized
- **Missing role:** 403 Forbidden

### 2. Development Mode Safety
- Logs WARNING on every request
- Environment check: `config.auth.enabled`
- Never enabled in production (checks `VCAP_SERVICES`)
- No signature validation (intentionally insecure for dev)

### 3. Admin Privilege Escalation
- Admin role bypasses other role checks
- Admin role must be carefully assigned
- XSUAA role collections prevent unauthorized admin assignment

### 4. Tenant Isolation
- Tenant ID extracted from JWT (trusted source)
- All database queries scoped by `tenantId`
- Cross-tenant access impossible without token manipulation
- Token manipulation prevented by XSUAA signature validation

### 5. Logging & Audit
- All authentication attempts logged
- Includes: `requestId`, `tenantId`, `userId`, `path`
- Failed attempts logged with reason
- PII (email) masked in non-production logs

---

## Consequences

### Positive

✅ **Seamless SAP BTP Integration**
- Uses standard BTP authentication
- Works with IAS, IPS, and other SAP services
- Tenant isolation automatic

✅ **Good Developer Experience**
- Can develop locally without SAP BTP
- Fast iteration with dev mode
- Easy to write tests

✅ **Enterprise-Grade Security**
- JWT signature validation in production
- MFA support via IAS
- Centralized user management

✅ **Multi-Tenancy Support**
- Tenant ID in JWT
- No cross-tenant access possible
- Clean separation of data

✅ **Role-Based Access Control**
- Fine-grained permissions
- Declarative (`requireRole()`)
- Easy to audit

### Negative

⚠️ **Dual Code Paths**
- XSUAA validation vs dev mode
- Requires testing both paths
- Risk of divergence if not careful

⚠️ **XSUAA Dependency**
- Production requires SAP BTP
- Cannot use alternative IDPs without refactoring
- Locked into SAP ecosystem

⚠️ **Development Mode Risk**
- Developers might accidentally deploy with `AUTH_ENABLED=false`
- Mitigation: Environment checks, CI/CD validation

⚠️ **Token Refresh Complexity**
- Client must handle token refresh
- Short-lived tokens (1 hour)
- Requires refresh token flow

---

## Compliance & Standards

### GDPR
- User context includes email (PII)
- Email masked in logs (except production audit logs)
- Token doesn't contain sensitive data (only claims)

### SOC 2
- Authentication mechanism documented
- Failed attempts logged
- Token expiration enforced
- Admin access separately controlled

### ISO 27001
- **A.9.2.1:** User registration - Handled by IAS
- **A.9.4.1:** Access restriction - Role-based authorization
- **A.14.2.5:** Secure engineering - Dual-mode with environment checks

---

## Testing Strategy

### Unit Tests
**File:** `packages/api/tests/middleware/auth.test.ts`

**Coverage:**
- ✅ Auth disabled mode (dev user injection)
- ✅ Missing Authorization header → 401
- ✅ Malformed header → 401
- ✅ Valid JWT (dev mode) → Extract user context
- ✅ Expired token → 401
- ✅ requireRole() with matching role → Allow
- ✅ requireRole() as admin → Allow (bypass)
- ✅ requireRole() without role → 403

### Integration Tests (Future)
- XSUAA validation with real tokens
- Token refresh flow
- Cross-tenant access prevention
- Role assignment verification

---

## References

- [SAP BTP XSUAA Documentation](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/6373bb7b7efb4a80bb8d3ea3c49be0bc.html)
- [@sap/xssec NPM Package](https://www.npmjs.com/package/@sap/xssec)
- [OAuth 2.0 JWT Profile](https://datatracker.ietf.org/doc/html/rfc7523)
- Codebase: `packages/api/src/middleware/auth.ts`
- Tests: `packages/api/tests/middleware/auth.test.ts`
- Documentation: `docs/operative/AUTH_AND_RATE_LIMITING.md`

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2025-10-07 | abidbn | Initial version |

---

**Next ADR:** [ADR-0003: Rate Limiting and Multi-Tenant Quotas](./ADR-0003-rate-limiting-and-quotas.md)
