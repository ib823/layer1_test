# Security Exceptions

This document tracks accepted security vulnerabilities that cannot be immediately resolved.

## Accepted Vulnerabilities

### 1. validator.js URL Validation Bypass (GHSA-9965-vmph-33xx)

**Status:** Accepted Risk  
**Severity:** Moderate  
**Package:** validator@13.15.15  
**Path:** packages/api > swagger-jsdoc@6.2.8 > swagger-parser@10.0.3 > @apidevtools/swagger-parser@10.0.3 > z-schema@5.0.5 > validator@13.15.15

**Details:**
- **Vulnerability:** URL validation bypass in isURL function
- **Vulnerable Versions:** <=13.15.15 (all versions)
- **Patched Versions:** <0.0.0 (no patch available)
- **Advisory:** https://github.com/advisories/GHSA-9965-vmph-33xx

**Risk Assessment:**
- **Impact:** Low
- **Likelihood:** Low
- **Justification:**
  - This is a transitive dependency only used in API documentation tooling (swagger-jsdoc)
  - The vulnerable function (isURL validation) is not used in production code
  - API documentation is generated at build time, not runtime
  - No user input is processed through this validation path
  - The dependency is only in devDependencies context

**Mitigation:**
- Limit swagger-jsdoc usage to development/documentation only
- Do not expose Swagger UI in production without additional authentication
- Monitor for future patches to validator.js or swagger-jsdoc that might upgrade the dependency

**Resolution Plan:**
- Monitor validator.js releases for a patched version
- Consider alternative API documentation tools if a patch is not released within 6 months
- Review quarterly for updates

**Date Accepted:** 2025-10-21  
**Accepted By:** Development Team  
**Next Review:** 2026-01-21

---

## Previously Resolved Vulnerabilities

### 2. esbuild Development Server Request Bypass (GHSA-67mh-4wv8-2f99)
**Status:** Resolved  
**Date Resolved:** 2025-10-21  
**Resolution:** Updated vitest from 2.1.9 to 3.2.4, which includes esbuild@0.25.11 (>= 0.25.0 required)

### 3. vite server.fs.deny Bypass on Windows (GHSA-93m4-6634-74q7)
**Status:** Resolved  
**Date Resolved:** 2025-10-21  
**Resolution:** Updated vitest from 2.1.9 to 3.2.4, which includes vite@5.4.21 (>= 5.4.21 required)
