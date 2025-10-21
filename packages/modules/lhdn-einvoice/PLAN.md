# LHDN e-Invoice Business Model - Execution Plan

**Project**: Complete Business-Grade LHDN MyInvois e-Invoice Solution
**Branch**: `feature/lhdn-business-model-complete`
**Target**: Production-ready SaaS platform with 100% scenario coverage
**Timeline**: 10 phases, ~3-4 weeks (assuming 2-3 engineers)

---

## Current State Analysis

### ✅ What We Have (Phases 1-4 Complete)
- **Core Foundation**: Types, interfaces, domain models
- **Services Layer**: Mapping, Validation, Submission, QR, Notification
- **Orchestration**: LHDNInvoiceEngine with basic workflow
- **Persistence**: Repository with PostgreSQL integration
- **API**: REST controller with 6 endpoints
- **Testing**: 57 unit tests (100% pass rate), 53% code coverage
- **Database**: Basic schema (lhdn_einvoices, lhdn_audit_log, lhdn_tenant_config)

### ❌ Critical Gaps to Address

#### 1. **Business Logic Gaps**
- [ ] No idempotency mechanism (duplicate submission risk)
- [ ] No deduplication strategy (canonical hash)
- [ ] No retry/backoff logic with circuit breakers
- [ ] No queue-based processing for resilience
- [ ] No reconciliation jobs (SAP ↔ LHDN cross-check)
- [ ] Missing document types: Credit Note, Debit Note, Amendments
- [ ] No cancellation workflow
- [ ] No multi-company/multi-branch support
- [ ] No multi-currency handling (FX rates, rounding)
- [ ] No SAP Ariba integration
- [ ] No SuccessFactors integration

#### 2. **Data Model Gaps**
- [ ] No submission queue table
- [ ] No error/exception tracking table
- [ ] No mapping configuration tables (tax, doc type, party, branch, state)
- [ ] No event sourcing table (state transitions)
- [ ] No reconciliation table
- [ ] No idempotency keys table
- [ ] No dead-letter queue table
- [ ] No currency rounding rules table

#### 3. **UX Gaps** (No UI exists)
- [ ] Submission Monitor
- [ ] Exception Inbox
- [ ] Audit Explorer
- [ ] Config Studio
- [ ] Operational Dashboard
- [ ] Invoice Detail View
- [ ] Ariba/SFx Bridges

#### 4. **Testing Gaps**
- [ ] No integration tests
- [ ] No E2E tests (Playwright)
- [ ] No contract tests (SAP OData, LHDN API)
- [ ] No fault injection tests
- [ ] No load tests
- [ ] Missing 30+ scenario coverage (only basic happy path)

#### 5. **Ops/Resilience Gaps**
- [ ] No observability (metrics, traces, structured logs)
- [ ] No retry mechanisms
- [ ] No circuit breakers
- [ ] No rate limiting per tenant
- [ ] No health checks/readiness probes
- [ ] No graceful shutdown
- [ ] No backup/restore procedures

---

## Execution Phases

### **Phase 5: Idempotency & Resilience Foundation** (Days 1-3)
**Goal**: Eliminate duplicate submissions, add retry logic

#### Deliverables:
1. **Idempotency Service**
   - Canonical payload builder (deterministic JSON with SHA-256 hash)
   - Idempotency keys table (`lhdn_idempotency_keys`)
   - Dedup check before submission
   - Tests: same SAP doc submitted twice → idempotent response

2. **Queue Infrastructure**
   - Submission queue table (`lhdn_submission_queue`)
   - Dead-letter queue table (`lhdn_dead_letter_queue`)
   - Redis-backed job queue (BullMQ)
   - Retry with exponential backoff + jitter
   - Tests: 5xx errors → queued → retry → success

3. **Event Sourcing**
   - Document events table (`lhdn_doc_events`)
   - State machine for invoice lifecycle
   - Immutable event log for audit
   - Tests: status transitions logged correctly

4. **Circuit Breaker**
   - Implement Opossum circuit breaker for LHDN API
   - Fallback to queue when circuit open
   - Tests: repeated failures → circuit open → queue mode

**Files**:
```
src/services/IdempotencyService.ts
src/services/QueueService.ts
src/services/CircuitBreakerService.ts
src/state-machine/InvoiceStateMachine.ts
migrations/006_add_idempotency_queue.sql
tests/integration/idempotency.test.ts
tests/integration/queue.test.ts
```

---

### **Phase 6: Extended Data Model & Multi-Entity Support** (Days 4-6)
**Goal**: Support multi-company, multi-branch, multi-currency

#### Deliverables:
1. **Configuration Tables**
   - Tax code mapping (`lhdn_tax_map`)
   - Document type mapping (`lhdn_doc_type_map`)
   - Party/TIN enrichment (`lhdn_party_map`)
   - Branch/entity mapping (`lhdn_branch_map`)
   - State code mapping (`lhdn_state_map`)
   - Currency rounding rules (`lhdn_currency_rounding`)

2. **Migration Scripts**
   ```sql
   migrations/007_add_mapping_tables.sql
   migrations/008_add_multi_company.sql
   migrations/009_add_currency_support.sql
   ```

3. **Seed Data**
   - Demo tenant with ABMY company
   - Sample branches, tax codes, mappings
   - Test data for all scenarios

4. **Enhanced Repository**
   - Add methods for mapping CRUD
   - Add multi-company filters
   - Add reconciliation queries

**Files**:
```
migrations/007-009_*.sql
seeds/demo_tenant.sql
src/repository/ConfigRepository.ts
src/repository/ReconciliationRepository.ts
tests/integration/multi-company.test.ts
```

---

### **Phase 7: Document Type Coverage (CN/DN/Amendments)** (Days 7-9)
**Goal**: Handle all LHDN document types

#### Deliverables:
1. **Credit Note Workflow**
   - Link to original invoice
   - Partial/full credit support
   - Validation rules specific to CN
   - Tests: issue CN for partial amount

2. **Debit Note Workflow**
   - Link to original invoice
   - Additional charges flow
   - Tests: issue DN for freight charges

3. **Cancellation Workflow**
   - Pre-acceptance cancellation (DRAFT/VALIDATED)
   - Post-acceptance cancellation rules
   - Time window validation
   - Tests: cancel within/outside window

4. **Amendment Support** (if allowed by LHDN)
   - Configuration toggle (TODO: verify LHDN spec)
   - Amendment request flow
   - Tests: amend accepted invoice (if supported)

**Files**:
```
src/workflows/CreditNoteWorkflow.ts
src/workflows/DebitNoteWorkflow.ts
src/workflows/CancellationWorkflow.ts
src/workflows/AmendmentWorkflow.ts (TODO: pending LHDN spec)
tests/e2e/credit-note.spec.ts
tests/e2e/debit-note.spec.ts
tests/e2e/cancellation.spec.ts
```

---

### **Phase 8: SAP Integration Bridges (Ariba/SFx)** (Days 10-12)
**Goal**: Integrate Ariba & SuccessFactors

#### Deliverables:
1. **Ariba Procurement Invoice Bridge**
   - Cron job to poll approved invoices (every 15min)
   - Ariba → LHDN mapping service
   - Bulk submit workflow
   - Update Ariba with LHDN ref + QR
   - Tests: fetch 10 invoices → submit → success

2. **SuccessFactors Expense Bridge**
   - Poll approved expense reports
   - Filter vendor receipts requiring e-invoice
   - Aggregate by vendor
   - Submit to LHDN
   - Update expense line items
   - Tests: expense report → 3 vendors → 3 invoices

3. **Bridge Configuration**
   - Enable/disable per tenant
   - Polling frequency settings
   - Filter rules (amount threshold, vendor TIN required)

**Files**:
```
src/bridges/AribaBridge.ts
src/bridges/SuccessFactorsBridge.ts
src/services/AribaConnector.ts (if not exists)
src/services/SuccessFactorsConnector.ts (if not exists)
tests/integration/ariba-bridge.test.ts
tests/integration/sfsf-bridge.test.ts
```

---

### **Phase 9: Business UX (6 Core Screens)** (Days 13-18)
**Goal**: Build production-grade UI for finance operations

#### Deliverables:
1. **Submission Monitor** (`/lhdn/monitor`)
   - Pipeline view: DRAFT → SUBMITTED → ACCEPTED
   - Filters: date range, company, status, doc type
   - Search: invoice no, SAP doc, TIN, LHDN ref
   - Bulk actions: cancel, re-query, export
   - Infinite scroll pagination
   - Real-time status updates (WebSocket/polling)

2. **Exception Inbox** (`/lhdn/exceptions`)
   - Error buckets: Mapping, Validation, Transport, LHDN-Reject
   - Root cause analysis
   - One-click remediation:
     - "Fix in Config Studio" (opens mapping editor)
     - "Edit & Retry" (inline form)
     - Bulk retry
   - SLA countdown
   - Assignment to users

3. **Audit Explorer** (`/lhdn/audit`)
   - Chronological event timeline per invoice
   - Full request/response payloads
   - Immutable events (no edit/delete)
   - Export to PDF/CSV with signature
   - Advanced filters: actor, action, date, success/fail

4. **Config Studio** (`/lhdn/config`)
   - Tax Code Mapping Editor (SAP → LHDN)
   - Document Type Mapping
   - Party/TIN Enrichment
   - Branch/Entity Setup
   - OAuth Credentials Vault (masked, test connection)
   - Email Templates
   - Versioned config with rollback
   - Test mapping button (dry-run)

5. **Operational Dashboard** (`/lhdn/dashboard`)
   - KPIs:
     - Success rate (7-day trend)
     - Mean TAT (time to acceptance)
     - Backlog count
     - Retry count
   - SLA heatmap (by hour, by company)
   - Error breakdown (pie chart)
   - Tenant switcher
   - Export to Excel

6. **Invoice Detail** (`/lhdn/invoices/:id`)
   - SAP source snapshot (raw billing doc)
   - Canonical LHDN JSON (after mapping)
   - UBL XML preview (formatted, downloadable)
   - QR code display
   - Status timeline
   - Actions: Re-submit, Cancel, Issue CN/DN, Re-query
   - Diff view (SAP vs LHDN)

7. **Ariba/SFx Bridges** (`/lhdn/bridges`)
   - Intake result list (last 24h)
   - Mapping summary
   - Bulk submit status
   - Cron schedule status
   - Enable/disable toggle

#### Design Requirements:
- **Responsive**: Desktop-first (1366px → 4K)
- **Accessibility**: WCAG AA, keyboard nav, screen reader
- **i18n**: English & Bahasa Malaysia
- **Loading States**: Skeleton loaders
- **Empty States**: "What to do next" guidance
- **Error States**: Remediation suggestions
- **Toasts**: Success/fail notifications
- **Optimistic UI**: Only for safe operations (e.g., filters)

**Files**:
```
packages/web/src/app/lhdn/monitor/page.tsx
packages/web/src/app/lhdn/exceptions/page.tsx
packages/web/src/app/lhdn/audit/page.tsx
packages/web/src/app/lhdn/config/page.tsx
packages/web/src/app/lhdn/dashboard/page.tsx
packages/web/src/app/lhdn/invoices/[id]/page.tsx
packages/web/src/app/lhdn/bridges/page.tsx
packages/web/src/components/lhdn/*.tsx
packages/web/src/hooks/useLHDNInvoices.ts
packages/web/src/hooks/useLHDNConfig.ts
packages/web/src/locales/en.json
packages/web/src/locales/ms.json (Bahasa Malaysia)
tests/e2e/lhdn-ui.spec.ts
```

---

### **Phase 10: Comprehensive Testing** (Days 19-22)
**Goal**: Achieve 30+ test scenarios, 80%+ coverage

#### Test Matrix (30 scenarios minimum):

| ID | Scenario | Type | Files |
|----|----------|------|-------|
| T-001 | Standard invoice submit | E2E | `standard-invoice.spec.ts` |
| T-002 | Duplicate submit (idempotency) | I/E2E | `idempotency.test.ts` |
| T-003 | Token expiry mid-flow | I | `token-refresh.test.ts` |
| T-004 | Rejection (tax map missing) | E2E | `validation-error.spec.ts` |
| T-005 | Credit Note (partial) | E2E | `credit-note.spec.ts` |
| T-006 | Debit Note | E2E | `debit-note.spec.ts` |
| T-007 | Cancel within window | E2E | `cancellation.spec.ts` |
| T-008 | 429 throttle | I/Load | `rate-limit.test.ts` |
| T-009 | 5xx outage + retry | E2E | `outage-recovery.spec.ts` |
| T-010 | 1000+ lines | U/I/E2E | `large-document.test.ts` |
| T-011 | FX rounding (USD → MYR) | U/I | `currency-rounding.test.ts` |
| T-012 | Multi-company | I | `multi-company.test.ts` |
| T-013 | Multi-branch | I | `multi-branch.test.ts` |
| T-014 | Ariba invoice import | I/E2E | `ariba-bridge.spec.ts` |
| T-015 | SFx expense import | I/E2E | `sfsf-bridge.spec.ts` |
| T-016 | TIN validation (format) | U | `tin-validation.test.ts` |
| T-017 | State code mapping | U | `state-mapping.test.ts` |
| T-018 | Tax calculation (multi-line) | U | `tax-calculation.test.ts` |
| T-019 | Discount distribution | U | `discount.test.ts` |
| T-020 | Freight charges | U | `freight.test.ts` |
| T-021 | Unicode in descriptions | I | `unicode.test.ts` |
| T-022 | Long strings (255+ chars) | I | `long-strings.test.ts` |
| T-023 | Zero-rated items | U | `zero-rated.test.ts` |
| T-024 | Exempt items | U | `exempt.test.ts` |
| T-025 | Email notification | I | `notifications.test.ts` |
| T-026 | Email bounce handling | I | `email-bounce.test.ts` |
| T-027 | Webhook delivery | I | `webhook.test.ts` |
| T-028 | Reconciliation job | I | `reconciliation.test.ts` |
| T-029 | Circuit breaker open | I | `circuit-breaker.test.ts` |
| T-030 | Queue processing | I | `queue-worker.test.ts` |
| T-031 | UBL XML generation | U | `ubl-xml.test.ts` |
| T-032 | UBL schema validation | I | `ubl-schema.test.ts` |
| T-033 | QR code generation | U | `qr-code.test.ts` |
| T-034 | Audit log immutability | I | `audit-log.test.ts` |
| T-035 | RLS cross-tenant leakage | I | `rls-security.test.ts` |
| T-036 | Load test (1000 concurrent) | Load | `load-test.js` |

#### Testing Tools:
- **Unit**: Jest/Vitest
- **Integration**: Supertest (API), Testcontainers (DB)
- **E2E**: Playwright (UI), Supertest (API)
- **Contract**: Pact (SAP OData, LHDN API)
- **Load**: k6 or Artillery
- **Fault Injection**: Toxiproxy

**Files**:
```
tests/unit/** (expand existing)
tests/integration/** (new)
tests/e2e/** (new)
tests/contract/** (new)
tests/load/** (new)
tests/matrix.csv (scenario checklist)
```

---

### **Phase 11: Observability & Operations** (Days 23-25)
**Goal**: Production-ready monitoring and ops tools

#### Deliverables:
1. **Structured Logging**
   - Winston with JSON formatter
   - Correlation IDs (trace ID, span ID)
   - Log levels per environment
   - PII redaction

2. **Metrics**
   - Prometheus client
   - Custom metrics:
     - `lhdn_submissions_total{status,tenant,company}`
     - `lhdn_submission_duration_seconds`
     - `lhdn_queue_depth{queue_name}`
     - `lhdn_errors_total{error_type,tenant}`
     - `lhdn_circuit_breaker_state{service}`
   - Grafana dashboards (JSON exports)

3. **Tracing**
   - OpenTelemetry integration
   - Trace SAP → Mapping → Validation → Submission → LHDN
   - Jaeger/Zipkin compatible

4. **Alerts**
   - Prometheus AlertManager rules:
     - Error rate > 5% for 5min
     - Queue depth > 1000
     - Token refresh failures
     - Circuit breaker open for 10min
   - PagerDuty/Slack integration

5. **Health Checks**
   - `/health` (liveness)
   - `/ready` (readiness - DB + Redis + LHDN API)
   - Graceful shutdown (drain queue before exit)

**Files**:
```
src/observability/logger.ts
src/observability/metrics.ts
src/observability/tracer.ts
src/health/healthcheck.ts
ops/grafana-dashboards/lhdn-dashboard.json
ops/prometheus/alerts.yml
ops/prometheus/rules.yml
```

---

### **Phase 12: Documentation & DoD** (Days 26-28)
**Goal**: Complete documentation for ops and users

#### Deliverables:
1. **SCENARIOS.md**
   - Checklist of all 35+ scenarios
   - Mark each as implemented + tested
   - Link to test files

2. **RUNBOOK.md**
   - Deployment steps (blue/green)
   - Environment variables
   - Database migrations
   - Rollback procedures
   - Common operational tasks:
     - Add new tenant
     - Rotate OAuth credentials
     - Re-process failed invoices
     - Run reconciliation
   - Troubleshooting guide

3. **E2E_TESTS.md**
   - How to run E2E tests
   - Test data setup
   - Sandbox vs prod toggles
   - CI/CD integration

4. **MAPPINGS.md**
   - SAP document types → LHDN types
   - SAP tax codes → LHDN tax types
   - SAP state codes → Malaysian states
   - Currency rounding rules
   - TIN format validation
   - Configuration examples

5. **API_GUIDE.md**
   - All REST endpoints
   - Request/response schemas
   - Error codes
   - Rate limits
   - Authentication

6. **USER_GUIDE.md** (for finance users)
   - How to use Submission Monitor
   - How to fix exceptions
   - How to configure mappings
   - How to issue CN/DN
   - How to run reports

7. **RELEASE_NOTES.md**
   - Feature list
   - Test coverage %
   - Screenshots of 6 core screens
   - Known limitations
   - Roadmap

**Files**:
```
docs/SCENARIOS.md
docs/RUNBOOK.md
docs/E2E_TESTS.md
docs/MAPPINGS.md
docs/API_GUIDE.md
docs/USER_GUIDE.md
RELEASE_NOTES.md
```

---

## Security & Compliance Checklist

- [ ] TLS 1.3 enforced
- [ ] JWT with 15-min expiry + refresh tokens
- [ ] Secrets in HashiCorp Vault / AWS KMS
- [ ] PII minimization (no unnecessary data collected)
- [ ] Field-level encryption for sensitive fields
- [ ] 7-year audit retention enforced
- [ ] Immutable audit log (no UPDATE/DELETE)
- [ ] Export tooling for audit (PDF/CSV with signature)
- [ ] RLS tested (no cross-tenant leakage)
- [ ] Rate limiting: 100 req/min per tenant
- [ ] CSRF protection for UI
- [ ] XSS protection (input sanitization)
- [ ] SQL injection prevention (parameterized queries)
- [ ] Key rotation procedures documented
- [ ] Least-privilege service accounts
- [ ] Security scanning (OWASP, Snyk)

---

## Definition of Done (DoD)

### Code Quality
- [ ] TypeScript strict mode
- [ ] No `any` types (use `unknown` + type guards)
- [ ] Zod/JSON Schema for all validation
- [ ] ESLint passing (0 errors, 0 warnings)
- [ ] Prettier formatted
- [ ] Code review approved (2+ approvers)

### Testing
- [ ] Unit test coverage ≥ 80%
- [ ] Integration test coverage ≥ 70%
- [ ] E2E tests for critical paths
- [ ] Contract tests for external APIs
- [ ] Load tests passing (1000 concurrent users)
- [ ] All 35+ scenarios tested

### Documentation
- [ ] All TODOs resolved or moved to backlog
- [ ] API endpoints documented (OpenAPI/Swagger)
- [ ] User guide complete
- [ ] Runbook complete
- [ ] Release notes complete

### Deployment
- [ ] Blue/green deployment strategy tested
- [ ] Database migrations tested (up + down)
- [ ] Seed scripts tested
- [ ] Sandbox environment tested
- [ ] Production readiness checklist signed off

### Operations
- [ ] Health checks working
- [ ] Metrics exported to Prometheus
- [ ] Alerts configured
- [ ] Logs structured and PII-redacted
- [ ] Tracing working (end-to-end)
- [ ] Backup/restore procedures tested

---

## Open Questions & TODOs

### LHDN MyInvois Specification
- [ ] **TODO**: Verify amendment support
  **Assumption**: Amendments not supported post-acceptance (only CN/DN)
  **Ref**: https://sdk.myinvois.hasil.gov.my (check latest spec)
  **Action**: Implement config toggle; if unsupported, disable UI

- [ ] **TODO**: Verify cancellation time window
  **Assumption**: 72 hours post-acceptance
  **Ref**: LHDN SDK Guideline v4.0 Section 5.3
  **Action**: Make configurable per tenant

- [ ] **TODO**: Verify max line items
  **Assumption**: 999 lines (validation rule LHDN-108)
  **Ref**: UBL 2.1 spec
  **Action**: Implement chunking if > 999 (split into multiple docs)

### SAP API Coverage
- [ ] **TODO**: Verify Ariba Network API endpoints
  **Assumption**: `/api/procurement/invoices` exists
  **Ref**: SAP Ariba Developer Portal
  **Action**: Use mock in integration tests; verify with real Ariba tenant

- [ ] **TODO**: Verify SuccessFactors expense report OData path
  **Assumption**: `/odata/v2/ExpenseReport`
  **Ref**: SAP SFx OData API Reference
  **Action**: Use mock in integration tests; verify with real SFx tenant

### Business Rules
- [ ] **TODO**: Confirm multi-currency support scope
  **Assumption**: LHDN requires MYR; FX conversion done pre-submission
  **Ref**: LHDN SDK
  **Action**: Document conversion rules; use SAP exchange rate table

- [ ] **TODO**: Confirm WHT (withholding tax) handling
  **Assumption**: WHT is separate from e-invoice (not submitted to LHDN)
  **Ref**: Malaysia tax regulations
  **Action**: Document exclusion; add config toggle if needed

---

## Success Criteria

### Business Outcomes
✅ **Zero duplicate submissions** (idempotency working)
✅ **99.9% submission success rate** (excluding validation errors)
✅ **< 5 second TAT** (time to acceptance) for standard invoice
✅ **Zero cross-tenant data leakage** (RLS enforced)
✅ **< 1% exception rate** (after config stabilization)
✅ **Finance team onboarded** with < 2 hours training

### Technical Outcomes
✅ **80%+ code coverage** across unit/integration/e2e
✅ **All 35+ scenarios tested** and passing
✅ **Load test passing**: 1000 concurrent submissions/min
✅ **Security scan passing**: No critical/high vulnerabilities
✅ **Ops dashboard live**: Real-time KPIs visible
✅ **Blue/green deployment**: Zero-downtime releases

### User Experience
✅ **Exception Inbox empty** for demo tenant
✅ **Config Studio**: Finance team can self-configure mappings
✅ **Submission Monitor**: Real-time status updates
✅ **Audit Explorer**: Full 7-year trail accessible
✅ **i18n working**: English + Bahasa Malaysia

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LHDN API downtime | High | Queue-based processing, retry logic, circuit breaker |
| SAP OData performance | Medium | Connection pooling, caching, batch requests |
| Token refresh failures | High | Proactive refresh (before expiry), fallback to re-auth |
| Large document processing | Medium | Streaming, chunking for > 999 lines, async processing |
| Cross-tenant data leak | Critical | RLS enforcement, automated testing, code review |
| Email delivery failures | Low | Bounce handling, retry with backoff, fallback to webhook |
| Database migration failure | High | Tested rollback scripts, blue/green deployment |
| Load spike (month-end) | Medium | Auto-scaling, queue buffering, rate limiting |

---

## Next Steps

1. **Create branch**: `git checkout -b feature/lhdn-business-model-complete`
2. **Start Phase 5**: Idempotency & Resilience
3. **Daily standups**: Track progress against PLAN.md
4. **Weekly demos**: Show UX progress to stakeholders
5. **Sprint reviews**: Mark scenarios as complete in SCENARIOS.md
6. **Final release**: Merge to `main` with full documentation

---

**Estimated Completion**: ~4 weeks (with 2-3 engineers)
**Current Phase**: Ready to begin Phase 5
**Next Milestone**: Idempotency working (Day 3)
