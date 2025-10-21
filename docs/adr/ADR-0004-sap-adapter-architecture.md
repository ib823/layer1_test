# ADR-0004: SAP System Adapter Architecture

**Status:** Accepted
**Date:** 2025-10-07
**Decision Makers:** Development Team
**Technical Story:** Extensible architecture for integrating with multiple SAP products

## Context

The SAP MVP Framework needs to integrate with multiple SAP products:
- **S/4HANA** - Core ERP system (users, roles, authorizations, GL data, vendors)
- **SAP IPS** - Identity Provisioning Service (user lifecycle management)
- **SAP Ariba** - Procurement platform (suppliers, purchase orders, invoices)
- **SAP SuccessFactors** - HR management (employees, org structure, compensation)

Each SAP product has:
- Different authentication methods (OAuth2, Basic Auth, API keys)
- Different API styles (OData v2, OData v4, REST, SCIM)
- Different error handling conventions
- Different rate limiting and retry strategies
- Different availability SLAs

We need an adapter architecture that:
- Provides consistent interface for application logic
- Handles SAP-specific complexity (auth, retries, circuit breakers)
- Supports development without live SAP connections (stub mode)
- Scales to add new SAP products easily
- Integrates with BTP Destination service for production

## Decision

We will implement a **hierarchical adapter architecture** with a **BaseSAPConnector** providing common functionality and **product-specific connectors** implementing product logic.

### Architecture Layers

```
Application Logic (Services, Controllers)
           ↓
   Product Adapter Interface
           ↓
   Concrete Adapter (S4HANAConnector, AribaConnector, etc.)
           ↓
   BaseSAPConnector (auth, retry, circuit breaker)
           ↓
   HTTP Client (axios / BTP Destination Client)
           ↓
   SAP System
```

### Base Connector Pattern

**BaseSAPConnector** (abstract class) provides:
- Circuit breaker (fail-fast after 5 consecutive errors)
- Exponential backoff retry (3 attempts, configurable)
- Authentication management (OAuth2, Basic, API keys)
- Request/response logging with PII masking
- Health check implementation
- SAP error mapping to framework errors

**All concrete connectors extend BaseSAPConnector:**
```typescript
export abstract class BaseSAPConnector {
  protected abstract getAuthToken(): Promise<string>;
  protected abstract mapSAPError(error: unknown): FrameworkError;
  protected abstract getHealthCheckEndpoint(): string;

  // Provided by base class
  protected async request<T>(config: RequestConfig): Promise<T>;
  public async healthCheck(): Promise<HealthStatus>;
  public getCircuitBreakerState(): CircuitState;
}
```

### Product-Specific Connectors

#### 1. S4HANAConnector
- **Protocol:** OData v2
- **Auth:** OAuth2ClientCredentials (BTP Destination)
- **APIs:** API_USER_SRV, API_ROLE_SRV, API_BUSINESS_PARTNER, API_JOURNALENTRY_SRV
- **Status:** ✅ Production-ready (100% implementation)

#### 2. IPSConnector
- **Protocol:** SCIM 2.0
- **Auth:** OAuth2 or Basic
- **APIs:** Users, Groups
- **Status:** ✅ Production-ready

#### 3. AribaConnector
- **Protocol:** REST APIs
- **Auth:** OAuth2 + API Key (in header)
- **APIs:** Suppliers, Purchase Orders, Invoices, Contracts
- **Status:** ⚠️ Stub mode only (production methods to be implemented)
- **Stub Mode:** Enabled via `ARIBA_STUB_MODE=true`

#### 4. SuccessFactorsConnector
- **Protocol:** OData v2/v4
- **Auth:** OAuth2 or Basic (apiKey@companyId)
- **APIs:** User, EmployeeProfile, OrganizationalChart, Compensation
- **Status:** ⚠️ Basic implementation (needs enhancement)
- **Stub Mode:** Enabled via `SF_STUB_MODE=true`

### BTP Destination Integration

**Production Mode:**
- All SAP calls go through BTP Destination service
- Factory functions: `createS4HANAClient(jwt)`, `createAribaClient(jwt)`, etc.
- OAuth tokens managed by Destination service
- No hardcoded URLs or credentials in code

**Destination Client Wrapper:**
```typescript
export class DestinationClient {
  constructor(options: {
    destinationName: string;  // e.g., 'S4HANA_API'
    jwt?: string;              // For principal propagation
  });

  async get<T>(path: string): Promise<T>;
  async post<T>(path: string, data: any): Promise<T>;
  // ... other HTTP methods
}
```

### Stub Mode (Development/Demo)

For offline development and demos:
- Enable via environment variable: `ARIBA_STUB_MODE=true`, `SF_STUB_MODE=true`
- Returns realistic mock data with simulated network latency (100-400ms)
- Useful for frontend development, testing, demos
- No real SAP connection required

**Factory Functions:**
```typescript
export function createAribaConnector(): AribaConnector {
  if (process.env.ARIBA_STUB_MODE === 'true') {
    return new AribaStubConnector();
  }
  return new AribaConnector(config);
}
```

### Error Handling Strategy

**Error Hierarchy:**
```
FrameworkError (base)
├── AuthenticationError (401, token expired)
├── ConnectorError (SAP system errors)
│   ├── CircuitBreakerOpenError (service unavailable)
│   └── ODataQueryError (malformed query)
└── ConfigurationError (missing credentials)
```

**Retry Strategy:**
- **Retryable:** 5xx errors, timeouts, network errors
- **Non-retryable:** 4xx errors (except 429 rate limit)
- **Exponential backoff:** 1s, 2s, 4s (with jitter)
- **Circuit breaker:** Opens after 5 consecutive failures, stays open for 60s

### Configuration

**Connector Configuration:**
```typescript
interface SAPConnectorConfig {
  baseUrl: string;
  auth: {
    type: 'oauth2' | 'basic' | 'apikey';
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
  };
  retry?: {
    maxRetries: number;
    baseDelay: number;
  };
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
  };
}
```

## Consequences

### Positive

- **Consistency:** All SAP integrations follow same patterns (auth, retry, error handling)
- **Reliability:** Circuit breaker and retry logic prevent cascading failures
- **Extensibility:** Easy to add new SAP products (extend BaseSAPConnector)
- **Testability:** Stub mode allows development without live SAP systems
- **Production-ready:** BTP Destination integration for enterprise deployments
- **Observability:** Centralized logging, circuit breaker state monitoring
- **Security:** Credentials managed by BTP, never in code

### Negative

- **Abstraction cost:** Base class adds complexity for simple connectors
- **Stub maintenance:** Mock data must be kept in sync with real APIs
- **Testing complexity:** Need both unit tests (with mocks) and integration tests (with stubs)
- **BTP dependency:** Production mode requires BTP Destination service

### Trade-offs

1. **Base Class vs. Composition**
   - Chose inheritance for enforcing common patterns
   - All connectors MUST implement circuit breaker, retry, health check
   - Alternative (composition) would be more flexible but less enforceable

2. **Stub Mode vs. Mock Server**
   - Chose stub mode (in-process mocks) for simplicity
   - Alternative: Standalone mock SAP server (more realistic but complex setup)

3. **BTP Destinations vs. Direct Configuration**
   - Chose BTP Destinations for production (enterprise-grade credential management)
   - Fallback to direct configuration for development
   - Aligns with SAP BTP best practices

4. **OData Client Library vs. Manual Requests**
   - Chose manual axios requests with OData query builders
   - More control, easier debugging, lighter weight
   - Trade-off: No automatic type generation from $metadata

## Alternatives Considered

### 1. SAP Cloud SDK (Complete Abstraction)
- **Pros:** Fully featured, type-safe, maintained by SAP
- **Cons:** Heavy, opinionated, limited to SAP Cloud SDK supported APIs
- **Decision:** Use for BTP Destinations only, not full SDK

### 2. No Base Class (Each Connector Independent)
- **Pros:** Maximum flexibility per product
- **Cons:** Duplicate code, inconsistent error handling, no enforced patterns
- **Rejected:** Too much duplication, hard to maintain

### 3. Generic HTTP Adapter (Not SAP-Specific)
- **Pros:** Could support non-SAP systems
- **Cons:** Doesn't handle SAP-specific patterns (OData, CSRF tokens, etc.)
- **Rejected:** SAP systems have unique requirements

### 4. GraphQL Wrapper (Unified API)
- **Pros:** Single query language for all SAP systems
- **Cons:** Complex to implement, performance overhead, doesn't map well to OData
- **Rejected:** Over-engineering, OData already provides good query capabilities

## Implementation Status

### Completed
- [x] BaseSAPConnector abstract class
- [x] Circuit breaker implementation
- [x] Exponential backoff retry
- [x] S4HANAConnector (production-ready)
- [x] IPSConnector (production-ready)
- [x] BTP Destination client wrapper
- [x] Factory functions for connectors
- [x] Health check endpoints
- [x] Error mapping hierarchy

### In Progress
- [⏳] AribaConnector (stub mode complete, production methods TODO)
- [⏳] SuccessFactorsConnector (basic implementation, needs enhancement)

### TODO
- [ ] Connector retry customization per product (Ariba has different rate limits)
- [ ] CSRF token handling for write operations
- [ ] Batch operation support for OData
- [ ] $metadata caching for type inference
- [ ] Connector usage metrics (calls, latency, errors)

## Monitoring & Operations

### Metrics to Track
- Circuit breaker state per connector
- Retry attempts per connector
- Average response time per SAP system
- Error rate by error type
- BTP Destination fetch latency

### Alerting Thresholds
- **Critical:** Circuit breaker open for >5 minutes
- **Warning:** Error rate >5% for any connector
- **Info:** Response time >2 seconds (p95)

### Debugging
- All requests logged with requestId
- Circuit breaker state changes logged
- SAP error responses logged (with PII masking)
- Health check results exposed at `/api/capabilities/{product}/apis`

## References

- Base Connector: `packages/core/src/connectors/base/BaseSAPConnector.ts`
- S/4HANA Connector: `packages/core/src/connectors/s4hana/S4HANAConnector.ts`
- Ariba Connector: `packages/core/src/connectors/ariba/AribaConnector.ts`
- SuccessFactors Connector: `packages/core/src/connectors/successfactors/SuccessFactorsConnector.ts`
- Destination Client: `packages/api/src/lib/destinationClient.ts`
- Circuit Breaker: `packages/core/src/utils/circuitBreaker.ts`
- Retry Strategy: `packages/core/src/utils/retry.ts`

## Future Enhancements

### v1.1
- Complete Ariba and SuccessFactors production implementations
- Add pagination support for large datasets
- Implement write operations with idempotency keys

### v2.0
- Add SAP Commerce Cloud connector
- Add SAP Analytics Cloud connector
- Implement $batch operations for OData
- Add automatic type generation from $metadata

---

**Last Updated:** 2025-10-07
**Next Review:** After completing Ariba and SuccessFactors production implementations
