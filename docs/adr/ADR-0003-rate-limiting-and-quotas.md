# ADR-0003: Rate Limiting and Quotas Strategy

**Status:** Accepted
**Date:** 2025-10-07
**Decision Makers:** Development Team
**Technical Story:** Protect API from abuse and ensure fair resource allocation

## Context

The SAP MVP Framework exposes REST APIs that interact with SAP systems (S/4HANA, Ariba, SuccessFactors) and perform compute-intensive operations (SoD analysis, anomaly detection). Without rate limiting:

- **DoS risk:** Malicious or misconfigured clients could overwhelm the API
- **SAP system protection:** Uncontrolled calls to SAP systems could trigger rate limits or performance degradation
- **Cost control:** Cloud resources (compute, database, SAP API calls) have associated costs
- **Fair usage:** One tenant could monopolize resources, degrading service for others
- **Compliance:** Some operations (service discovery, SoD analysis) are expensive and should be throttled

## Decision

We will implement **multi-tiered, Redis-backed rate limiting** with **per-tenant isolation** and **operation-specific quotas**.

### Architecture

```
Request → apiLimiter (global) → authenticate → Operation-specific limiter → Route
          (100 req/min)            (extract tenantId)   (5-1000 req/hour)
```

### Rate Limiting Tiers

| Tier | Scope | Limit | Use Case |
|------|-------|-------|----------|
| **Public** | Unauthenticated | 10 req/min | Health checks, version info |
| **Authenticated** | Per user | 100 req/min | General API usage |
| **Admin** | Per admin user | 1000 req/min | Admin operations, bulk queries |
| **Service Discovery** | Per tenant | 5 req/hour | Expensive SAP Gateway scan |
| **SoD Analysis** | Per tenant | 10 req/hour | CPU/memory intensive operation |

### Implementation Details

**Storage: Redis**
- Keys: `rl:{tenantId}:{userId}` or `rl:tenant:{tenantId}:{operation}`
- TTL: Automatic expiration based on window (e.g., 1 hour)
- Fallback: In-memory store if Redis unavailable (degrades to single-instance limit)

**Middleware Stack:**
```typescript
// Global limiter - Applied first
app.use('/api', apiLimiter);

// Authentication - Extracts tenantId + userId
app.use('/api', authenticate);

// Operation-specific limiters
app.post('/admin/tenants/:id/discover', discoveryLimiter, handleDiscovery);
app.post('/modules/sod/analyze', sodAnalysisLimiter, handleSoDAnalysis);
```

**Response Headers:**
- `RateLimit-Limit`: Total requests allowed in window
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait (when rate limited)

**Error Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 100,
  "remaining": 0,
  "resetAt": "2025-10-07T15:30:00Z",
  "retryAfter": 45
}
```

### Configuration

**packages/api/src/middleware/rateLimiting.ts:**
- `apiLimiter` - Global rate limiter (100 req/min per user)
- `discoveryLimiter` - Service discovery limiter (5 req/hour per tenant)
- `sodAnalysisLimiter` - SoD analysis limiter (10 req/hour per tenant)
- `adminLimiter` - Admin operations limiter (1000 req/min per admin)

**Environment Variables:**
- `REDIS_URL` - Redis connection string (optional, falls back to in-memory)
- `RATE_LIMIT_ENABLED` - Toggle rate limiting (default: true)
- `RATE_LIMIT_WINDOW_MS` - Window duration in milliseconds
- `RATE_LIMIT_MAX` - Max requests per window

## Consequences

### Positive

- **API protection:** Prevents DoS attacks and accidental abuse
- **SAP system protection:** Controls outbound calls to SAP systems
- **Fair resource allocation:** Prevents one tenant from monopolizing resources
- **Cost control:** Expensive operations (discovery, analysis) throttled appropriately
- **Scalability:** Redis-backed store scales across multiple API instances
- **Graceful degradation:** Fallback to in-memory if Redis unavailable
- **Visibility:** Response headers allow clients to implement backoff strategies

### Negative

- **Complexity:** Additional infrastructure dependency (Redis)
- **False positives:** Legitimate high-volume use cases may be rate limited
- **Multi-instance coordination:** In-memory fallback doesn't work across instances
- **Redis SPOF:** If Redis fails, rate limiting degrades to per-instance (still functional but less effective)

### Trade-offs

1. **Redis vs. In-Memory**
   - Chose Redis for multi-instance coordination
   - In-memory fallback ensures API doesn't fail if Redis unavailable
   - Cost: Additional infrastructure to manage

2. **Per-User vs. Per-Tenant**
   - Global limiter: Per-user (prevents individual user abuse)
   - Expensive operations: Per-tenant (tenant pays for their usage)
   - Rationale: Aligns with multi-tenant cost model

3. **Strict vs. Lenient Limits**
   - Chose lenient defaults (100 req/min for users)
   - Can be tightened based on real-world usage patterns
   - Expensive operations (discovery, analysis) have strict limits

4. **Block vs. Queue**
   - Chose to block (return 429) rather than queue requests
   - Simpler implementation, clearer feedback to clients
   - Clients can implement their own retry logic

## Alternatives Considered

### 1. No Rate Limiting (Trust Clients)
- **Pros:** Simple, no infrastructure
- **Cons:** Unacceptable security risk, no DoS protection
- **Rejected:** Must have rate limiting for production

### 2. API Gateway Rate Limiting (Cloud Foundry, AWS ALB)
- **Pros:** Offloads logic to infrastructure, battle-tested
- **Cons:** Less flexible (no operation-specific limits), harder to customize
- **Decision:** Use application-level for flexibility, could add gateway-level later as defense-in-depth

### 3. Token Bucket Algorithm (Manual Implementation)
- **Pros:** More granular control, can implement burst allowances
- **Cons:** More complex to implement correctly
- **Decision:** Use battle-tested `express-rate-limit` library instead

### 4. Per-IP Rate Limiting
- **Pros:** Simple, doesn't require authentication
- **Cons:** Inaccurate in multi-tenant scenario (shared IPs, proxies)
- **Rejected:** Use per-user and per-tenant for accurate attribution

### 5. Hard-Coded Limits (No Redis)
- **Pros:** No infrastructure dependency
- **Cons:** Doesn't scale across instances, can't dynamically adjust
- **Rejected:** Need Redis for production scalability

## Implementation Status

- [x] Redis-backed rate limiter implemented
- [x] In-memory fallback for development
- [x] Global API limiter (100 req/min per user)
- [x] Operation-specific limiters (discovery, SoD analysis)
- [x] Admin tier (1000 req/min)
- [x] Response headers (RateLimit-*, Retry-After)
- [x] Multi-tenant key isolation
- [x] Graceful Redis failure handling
- [ ] Dynamic limit adjustment per tenant (TODO)
- [ ] Usage analytics dashboard (TODO)
- [ ] Email alerts for repeated limit hits (TODO)

## Monitoring & Tuning

### Metrics to Track
- Rate limit hits per endpoint
- Rate limit hits per tenant
- Redis latency and availability
- Fallback to in-memory occurrences

### Tuning Guidelines
1. **Monitor 429 responses:** High rate indicates limits too strict or client misbehavior
2. **SAP API costs:** If SAP costs spike, tighten discovery/analysis limits
3. **User complaints:** If legitimate users hit limits, consider whitelisting or tier upgrade
4. **Tenant upgrades:** Implement paid tiers with higher limits if needed

### Alerting Thresholds
- **Critical:** >100 rate limit hits/min from single tenant (possible attack)
- **Warning:** Redis unavailable (degraded to in-memory)
- **Info:** Tenant consistently hitting limits (may need quota increase)

## References

- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [rate-limit-redis Store](https://github.com/wyattjoh/rate-limit-redis)
- Implementation: `packages/api/src/middleware/rateLimiting.ts`
- Configuration: `packages/api/src/config.ts`

## Notes

- Rate limits are **not** enforced in development mode (AUTH_ENABLED=false)
- Health check endpoints (`/health`, `/version`, `/healthz`) bypass rate limiting
- Admin operations have higher limits but still rate-limited (no unlimited access)
- Tenant-scoped limits prevent cross-tenant abuse
- Redis keys use TTL for automatic cleanup

---

**Last Updated:** 2025-10-07
**Next Review:** After 3 months of production usage (tune limits based on real data)
