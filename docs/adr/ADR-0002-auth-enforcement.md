# ADR-0002: Authentication Enforcement Strategy

**Status:** Accepted
**Date:** 2025-10-07
**Decision Makers:** Development Team
**Technical Story:** Production-ready authentication for SAP MVP Framework

## Context

The SAP MVP Framework is a multi-tenant GRC platform that handles sensitive compliance data (SoD violations, audit logs, user access reviews). We need a robust authentication and authorization strategy that:

- Supports enterprise SSO requirements
- Integrates natively with SAP BTP
- Provides tenant isolation at the authentication layer
- Allows for development/testing without complex auth setup
- Scales to support thousands of users across multiple tenants

## Decision

We will implement **SAP XSUAA (Extended Services for User Account and Authentication)** as our primary authentication provider, with a **development mode fallback** for local testing.

### Implementation Details

1. **Production Mode (AUTH_ENABLED=true)**
   - Full XSUAA JWT validation using `@sap/xssec` library
   - Token signature verification against XSUAA public keys
   - Token expiration checking
   - Tenant ID extraction from JWT claims
   - Role-based access control (RBAC) via XSUAA scopes

2. **Development Mode (AUTH_ENABLED=false)**
   - Simple JWT decoding without signature verification
   - Auto-generated dev user with admin privileges
   - WARNING logs on every request
   - Never enabled in production (fails if VCAP_SERVICES detected)

3. **Authentication Flow**
   ```
   User → App Router (XSUAA login) → JWT Token → Backend API
                                         ↓
                                 Validate JWT + Extract Claims
                                         ↓
                          res.locals.user = {id, email, roles, tenantId}
   ```

4. **Authorization Model**
   - Scopes: Admin, User, Auditor, TenantAdmin, SoDAnalyst, ComplianceOfficer
   - Role Collections: Assigned in BTP Cockpit
   - Per-endpoint authorization via `requireRole()` middleware

### Configuration

**packages/api/src/middleware/auth.ts:**
- `authenticate()` - Main authentication middleware
- `requireRole(role)` - Authorization middleware
- Applies to all routes except `/health`, `/version`, `/healthz`

**Environment Variables:**
- `AUTH_ENABLED` - Toggle authentication (default: true)
- `XSUAA_URL` - XSUAA OAuth endpoint (from VCAP_SERVICES)
- `XSUAA_CLIENT_ID` - Application client ID
- `XSUAA_CLIENT_SECRET` - Application client secret

## Consequences

### Positive

- **Enterprise-grade security:** XSUAA is SAP's standard authentication service, trusted by thousands of enterprise customers
- **Native BTP integration:** Seamless integration with SAP BTP services and user management
- **Multi-tenancy support:** Tenant ID embedded in JWT claims ensures data isolation
- **SSO compatibility:** Works with SAML, OAuth, OpenID Connect identity providers
- **Development flexibility:** Dev mode allows local testing without complex setup
- **Zero password management:** No need to store or manage user passwords

### Negative

- **SAP dependency:** Tightly coupled to SAP BTP ecosystem (mitigated by standard OAuth2/JWT)
- **Dev mode security risk:** Must ensure AUTH_ENABLED=true in production (enforced via VCAP_SERVICES check)
- **Token refresh complexity:** Frontend must handle token refresh flow
- **Rate limiting bypass:** Dev mode doesn't enforce rate limits properly (acceptable for development)

### Trade-offs

1. **XSUAA vs. Custom JWT**
   - Chose XSUAA for native BTP integration and enterprise support
   - Custom JWT would require building user management, SSO integrations, and tenant isolation ourselves

2. **Dev Mode vs. Always-On Auth**
   - Chose dev mode for developer experience
   - Ensures fast iteration without constant re-authentication
   - Risk mitigated by VCAP_SERVICES check preventing production misuse

3. **Middleware vs. Route-Level Auth**
   - Chose middleware for centralized enforcement
   - All routes protected by default (fail-secure)
   - Explicit whitelisting for public endpoints

## Alternatives Considered

### 1. Auth0 / Okta
- **Pros:** Full-featured, excellent docs, flexible
- **Cons:** Additional cost, not SAP-native, requires custom tenant mapping
- **Rejected:** Not aligned with SAP BTP ecosystem

### 2. Passport.js with Multiple Strategies
- **Pros:** Flexible, supports many providers
- **Cons:** More complex configuration, manual tenant isolation, no BTP integration
- **Rejected:** Too much custom code for enterprise requirements

### 3. SAP IAS (Identity Authentication Service)
- **Pros:** Modern SAP identity service, good UI
- **Cons:** XSUAA is standard for BTP apps, IAS better for external users
- **Decision:** Use XSUAA for BTP apps, could add IAS later for customer portals

### 4. No Authentication (API Keys Only)
- **Pros:** Simple, stateless
- **Cons:** No user context, difficult tenant isolation, poor audit trail
- **Rejected:** Unacceptable for compliance application

## Implementation Status

- [x] XSUAA authentication middleware implemented
- [x] Development mode with auto-generated user
- [x] Role-based authorization middleware
- [x] JWT token extraction and validation
- [x] Integration with App Router
- [x] Environment variable configuration
- [x] VCAP_SERVICES detection for production enforcement
- [ ] Token refresh flow in frontend (TODO)
- [ ] Session timeout warnings (TODO)

## References

- [SAP XSUAA Documentation](https://help.sap.com/docs/CP_AUTHORIZ_TRUST_MNG)
- [@sap/xssec Library](https://www.npmjs.com/package/@sap/xssec)
- Implementation: `packages/api/src/middleware/auth.ts`
- Configuration: `infrastructure/cloud-foundry/xs-security.json`
- Deployment Guide: `docs/BTP_PRODUCTION_DEPLOYMENT.md`

## Notes

- Authentication logging includes requestId, userId, and tenantId for audit trail
- All authentication failures return 401 Unauthorized with generic message (no information leakage)
- Token validation failures are logged with full context for debugging
- Production mode MUST have AUTH_ENABLED=true (enforced by code)

---

**Last Updated:** 2025-10-07
**Next Review:** Before v2.0 release (evaluate IAS integration for customer portals)
