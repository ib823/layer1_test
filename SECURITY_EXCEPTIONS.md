# Security Audit Exceptions

This document tracks accepted security risks in the project with justification and monitoring plans.

## Accepted Vulnerabilities

### validator@13.15.15 - URL Validation Bypass (GHSA-9965-vmph-33xx)

**CVE:** CVE-2025-56200  
**Severity:** Moderate (CVSS 6.1)  
**Package:** validator@13.15.15  
**Dependency Chain:** swagger-jsdoc@6.2.8 → swagger-parser@10.0.3 → @apidevtools/swagger-parser@10.0.3 → z-schema@5.0.5 → validator@13.15.15

**Vulnerability Details:**
A URL validation bypass exists in validator.js's `isURL()` function. The function uses '://' as a delimiter to parse protocols, while browsers use ':' as the delimiter. This parsing difference allows attackers to craft URLs that bypass protocol and domain validation, potentially leading to XSS and Open Redirect attacks.

**Risk Assessment:**
- **Impact:** Low for this codebase
- **Likelihood:** Very Low
- **Overall Risk:** Low

**Justification for Acceptance:**
1. **Limited Scope:** The vulnerability is only present in the API documentation generation tooling (swagger-jsdoc), not in production request handling code
2. **No Direct Usage:** The `isURL()` function from validator.js is not called directly by our codebase
3. **Documentation Only:** swagger-jsdoc is used solely to generate OpenAPI/Swagger documentation at build time or runtime for the `/api-docs` endpoint
4. **No User Input:** The documentation generation does not process user-supplied URLs through the vulnerable function
5. **No Patch Available:** As of 2025-10-22, no patched version exists (patched_versions: <0.0.0)
6. **Upstream Dependency:** The vulnerability is 4 levels deep in the dependency tree, making it difficult to work around without replacing swagger-jsdoc entirely

**Mitigation Measures:**
1. The `/api-docs` endpoint can be disabled in production via environment configuration if needed
2. API documentation is served over HTTPS with proper CSP headers via helmet middleware
3. No user-supplied data is processed by the swagger documentation generator
4. Regular monitoring of the vulnerability database for patches

**Monitoring Plan:**
- Review this exception quarterly (next review: 2026-01-22)
- Monitor https://github.com/advisories/GHSA-9965-vmph-33xx for updates
- Monitor https://github.com/validatorjs/validator.js for patches
- Consider alternatives to swagger-jsdoc if no patch is released within 6 months

**Alternatives Considered:**
- Replacing swagger-jsdoc with an alternative OpenAPI documentation generator (e.g., tsoa, @nestjs/swagger)
- Decision: Not implemented due to low risk and significant refactoring effort

**Approved By:** Development Team  
**Date:** 2025-10-22  
**Next Review:** 2026-01-22

---

## Audit Configuration

The project uses `audit-level=high` in `.npmrc` to exclude moderate vulnerabilities from failing CI/CD pipelines. This is justified because:

1. All moderate vulnerabilities are documented in this file
2. Critical and high severity vulnerabilities still fail the build
3. Manual review of moderate vulnerabilities occurs during dependency updates
4. Security scanning continues to run and report all findings for visibility

## Security Scan Workflow

1. **Automated Scans:** Run on every commit via GitHub Actions
2. **Failure Threshold:** High and Critical vulnerabilities
3. **Moderate Vulnerabilities:** Reported but don't fail CI/CD
4. **Review Process:** All new vulnerabilities are triaged within 48 hours
5. **Update Schedule:** Dependencies reviewed and updated monthly
