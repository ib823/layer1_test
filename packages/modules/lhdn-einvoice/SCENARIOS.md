# LHDN e-Invoice Scenario Coverage Checklist

**Status Legend**: ✅ Implemented & Tested | 🟡 Partially Done | ❌ Not Started | 🚧 In Progress

---

## Document Types (7 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| DT-001 | Standard Invoice (Type 01) | ✅ | `standard-invoice.spec.ts` | SAP F2 → LHDN 01 |
| DT-002 | Credit Note - Full (Type 02) | ❌ | `credit-note-full.spec.ts` | Reverse entire invoice |
| DT-003 | Credit Note - Partial (Type 02) | ❌ | `credit-note-partial.spec.ts` | Partial refund, linked to original |
| DT-004 | Debit Note (Type 03) | ❌ | `debit-note.spec.ts` | Additional charges post-invoice |
| DT-005 | Refund Note (Type 04) | ❌ | `refund-note.spec.ts` | SAP S1 → LHDN 04 |
| DT-006 | Self-Billed Invoice (Type 11) | ❌ | `self-billed.spec.ts` | Buyer creates invoice |
| DT-007 | Consolidated Invoice | ❌ | `consolidated.spec.ts` | Multiple deliveries → 1 invoice |

---

## Invoice Origins (8 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| OR-001 | SAP S/4HANA FI Billing (F2) | ✅ | `s4hana-fi.spec.ts` | Core flow tested |
| OR-002 | SAP S/4HANA SD Billing (F8) | ❌ | `s4hana-sd.spec.ts` | Sales & distribution |
| OR-003 | SAP Ariba Approved Supplier Invoice | ❌ | `ariba-supplier.spec.ts` | Ariba Network |
| OR-004 | SAP Ariba Purchase Order Invoice | ❌ | `ariba-po.spec.ts` | PO-backed invoice |
| OR-005 | SuccessFactors Expense Reimbursement | ❌ | `sfsf-expense.spec.ts` | Employee expense claims |
| OR-006 | SuccessFactors Payroll Service Invoice | ❌ | `sfsf-payroll.spec.ts` | Payroll vendor invoices |
| OR-007 | Manual Entry (UI Form) | ❌ | `manual-entry.spec.ts` | Finance user creates manually |
| OR-008 | API Submission (External System) | ❌ | `api-submission.spec.ts` | Third-party system via API |

---

## Tax Scenarios (12 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| TX-001 | Standard Rated 6% (SR) | ✅ | `tax-sr-6.test.ts` | SAP V6 → LHDN SR |
| TX-002 | Standard Rated 8% (SR) | ❌ | `tax-sr-8.test.ts` | Future rate change |
| TX-003 | Zero-Rated (ZP) | ❌ | `tax-zp.test.ts` | Export sales |
| TX-004 | Exempt (E) | ❌ | `tax-exempt.test.ts` | Essential goods |
| TX-005 | Out of Scope (OS) | ❌ | `tax-os.test.ts` | Non-taxable items |
| TX-006 | Deemed Supply (DS) | ❌ | `tax-ds.test.ts` | Special cases |
| TX-007 | Multi-Tax Lines (SR + ZP + E) | ❌ | `tax-multi-line.test.ts` | Mixed tax types in one invoice |
| TX-008 | Tax Rounding (0.01 precision) | ❌ | `tax-rounding.test.ts` | Edge case: 0.005 → 0.01 |
| TX-009 | Discount Distribution | ❌ | `tax-discount.test.ts` | Discount affects tax base |
| TX-010 | Freight/Shipping Tax | ❌ | `tax-freight.test.ts` | Freight line with tax |
| TX-011 | WHT (Withholding Tax) | ❌ | `tax-wht.test.ts` | TODO: Verify if LHDN requires WHT |
| TX-012 | Tax Code Unmapped | ❌ | `tax-unmapped.spec.ts` | Error handling, exception inbox |

---

## Master Data (10 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| MD-001 | Valid TIN (12 digits) | ✅ | `tin-12-digit.test.ts` | 009876543210 |
| MD-002 | Valid TIN (14 digits) | ✅ | `tin-14-digit.test.ts` | 00987654321012 |
| MD-003 | Invalid TIN Format | ✅ | `tin-invalid.test.ts` | Validation error |
| MD-004 | Missing TIN | ✅ | `tin-missing.test.ts` | Critical error |
| MD-005 | Branch Code Mapping | ❌ | `branch-mapping.test.ts` | Multi-branch company |
| MD-006 | State Code Mapping (14 states) | 🟡 | `state-mapping.test.ts` | WP KL tested, others pending |
| MD-007 | Address with Special Characters | ❌ | `address-special-chars.test.ts` | Unicode, diacritics |
| MD-008 | Long Business Name (>255 chars) | ❌ | `long-business-name.test.ts` | Truncation or error |
| MD-009 | Customer/Supplier Not Found in SAP | ❌ | `party-not-found.spec.ts` | Graceful error |
| MD-010 | Duplicate Party (Same TIN, Diff Name) | ❌ | `duplicate-party.spec.ts` | Reconciliation issue |

---

## Currency & FX (8 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| CU-001 | MYR Base Currency | ✅ | `currency-myr.test.ts` | Standard case |
| CU-002 | USD → MYR Conversion | ❌ | `currency-usd-myr.test.ts` | Use SAP exchange rate |
| CU-003 | EUR → MYR Conversion | ❌ | `currency-eur-myr.test.ts` | Date-based rate |
| CU-004 | SGD → MYR Conversion | ❌ | `currency-sgd-myr.test.ts` | Regional currency |
| CU-005 | FX Rounding Rules | ❌ | `fx-rounding.test.ts` | 2 decimal places for MYR |
| CU-006 | Mixed Currency Line Items | ❌ | `currency-mixed.test.ts` | Edge case: USD + EUR lines |
| CU-007 | Totals Reconciliation | ❌ | `currency-totals.test.ts` | Sum(lines) = total after FX |
| CU-008 | Invalid Currency (non-MYR submit) | ✅ | `currency-invalid.test.ts` | Validation error |

---

## Line Items (9 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| LI-001 | Single Line Item | ✅ | `line-items-single.test.ts` | Basic case |
| LI-002 | Multiple Line Items (10) | ✅ | `line-items-multiple.test.ts` | Standard |
| LI-003 | 999 Line Items (Max) | ❌ | `line-items-999.test.ts` | Validation passes |
| LI-004 | 1000+ Line Items (Over Limit) | ✅ | `line-items-1000.test.ts` | Validation error LHDN-108 |
| LI-005 | Long Description (>500 chars) | ❌ | `line-long-desc.test.ts` | Truncation or multi-line |
| LI-006 | Unicode in Description (中文, عربي) | ❌ | `line-unicode.test.ts` | UTF-8 encoding |
| LI-007 | Special Characters (@, #, %, &) | ❌ | `line-special-chars.test.ts` | XML escaping |
| LI-008 | Zero Quantity Line | ✅ | `line-zero-qty.test.ts` | Validation error LHDN-L01 |
| LI-009 | Negative Unit Price | ✅ | `line-negative-price.test.ts` | Validation error LHDN-L02 |

---

## Duplicates & Idempotency (6 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| IP-001 | Same SAP Doc Submitted Twice | ❌ | `idempotency-sap-doc.spec.ts` | Return existing invoice |
| IP-002 | Same Canonical Hash Submitted Twice | ❌ | `idempotency-hash.spec.ts` | Dedup by payload hash |
| IP-003 | Replay Attack (Same Request ID) | ❌ | `idempotency-replay.spec.ts` | JTI check |
| IP-004 | Concurrent Submissions (Race Condition) | ❌ | `idempotency-concurrent.spec.ts` | DB unique constraint + lock |
| IP-005 | Retry After Transient Failure | ❌ | `idempotency-retry.spec.ts` | Safe to retry |
| IP-006 | Manual Re-submit from UI | ❌ | `idempotency-manual.spec.ts` | User clicks "Submit" again |

---

## Invoice Lifecycle (10 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| LC-001 | DRAFT → VALIDATED | 🟡 | `lifecycle-draft-validated.test.ts` | Partial |
| LC-002 | VALIDATED → SUBMITTED | 🟡 | `lifecycle-validated-submitted.spec.ts` | Partial |
| LC-003 | SUBMITTED → ACCEPTED | 🟡 | `lifecycle-submitted-accepted.spec.ts` | Partial |
| LC-004 | SUBMITTED → REJECTED | ❌ | `lifecycle-submitted-rejected.spec.ts` | LHDN validation fail |
| LC-005 | ACCEPTED → Issue Credit Note | ❌ | `lifecycle-cn.spec.ts` | Link to original |
| LC-006 | ACCEPTED → Issue Debit Note | ❌ | `lifecycle-dn.spec.ts` | Link to original |
| LC-007 | DRAFT → CANCELLED (Pre-submit) | ❌ | `lifecycle-cancel-draft.spec.ts` | User cancels before submit |
| LC-008 | ACCEPTED → CANCELLED (Post-submit) | ❌ | `lifecycle-cancel-accepted.spec.ts` | Within time window |
| LC-009 | REJECTED → Fix → VALIDATED | ❌ | `lifecycle-fix-rejection.spec.ts` | Re-validation after fix |
| LC-010 | Status Query (Poll LHDN) | ❌ | `lifecycle-status-query.spec.ts` | Async status update |

---

## Cancellation & Amendments (7 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| CA-001 | Cancel DRAFT Invoice | ❌ | `cancel-draft.spec.ts` | Simple status change |
| CA-002 | Cancel VALIDATED Invoice | ❌ | `cancel-validated.spec.ts` | Before submission |
| CA-003 | Cancel ACCEPTED (Within 72h) | ❌ | `cancel-within-window.spec.ts` | TODO: Verify window |
| CA-004 | Cancel ACCEPTED (Outside 72h) | ❌ | `cancel-outside-window.spec.ts` | Should fail |
| CA-005 | Amendment (If Supported) | ❌ | `amendment.spec.ts` | TODO: Verify LHDN support |
| CA-006 | Void vs Cancel (Terminology) | ❌ | `void-vs-cancel.spec.ts` | Clarify LHDN terms |
| CA-007 | Cascade Cancel (CN/DN of Cancelled) | ❌ | `cascade-cancel.spec.ts` | Business rule |

---

## Resilience & Fault Handling (15 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| RS-001 | OAuth Token Expired (401) | ❌ | `token-expired.test.ts` | Auto-refresh |
| RS-002 | OAuth Token Refresh Failure | ❌ | `token-refresh-fail.test.ts` | Re-authenticate |
| RS-003 | LHDN API Rate Limit (429) | ❌ | `rate-limit-429.test.ts` | Backoff + retry |
| RS-004 | LHDN API 5xx Error | ❌ | `lhdn-5xx.spec.ts` | Queue + retry |
| RS-005 | LHDN API Timeout (30s) | ❌ | `lhdn-timeout.spec.ts` | Retry with longer timeout |
| RS-006 | SAP OData Connection Timeout | ❌ | `sap-timeout.spec.ts` | Retry |
| RS-007 | SAP OData 500 Error | ❌ | `sap-500.spec.ts` | Queue + retry |
| RS-008 | Database Connection Lost | ❌ | `db-connection-lost.spec.ts` | Retry + circuit breaker |
| RS-009 | Redis Connection Lost | ❌ | `redis-connection-lost.spec.ts` | Fallback to DB |
| RS-010 | Circuit Breaker Open (LHDN) | ❌ | `circuit-breaker-lhdn.test.ts` | Queue mode |
| RS-011 | Circuit Breaker Half-Open → Success | ❌ | `circuit-breaker-recovery.test.ts` | Resume |
| RS-012 | Dead-Letter Queue Processing | ❌ | `dlq-processing.spec.ts` | Manual intervention |
| RS-013 | Network Flap (Transient) | ❌ | `network-flap.test.ts` | Retry succeeds |
| RS-014 | Graceful Shutdown (Drain Queue) | ❌ | `graceful-shutdown.test.ts` | No data loss |
| RS-015 | Outage Recovery (24h LHDN Down) | ❌ | `outage-recovery.spec.ts` | Backlog processing |

---

## Reconciliation (6 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| RC-001 | Daily Reconciliation (SAP ↔ LHDN) | ❌ | `recon-daily.spec.ts` | Cron job |
| RC-002 | Mismatch Detection | ❌ | `recon-mismatch.spec.ts` | Alert + report |
| RC-003 | Late Arrival (LHDN Delayed Accept) | ❌ | `recon-late-arrival.spec.ts` | Re-sync |
| RC-004 | Orphaned Records (LHDN No SAP) | ❌ | `recon-orphaned.spec.ts` | Investigation |
| RC-005 | Status Discrepancy | ❌ | `recon-status-diff.spec.ts` | SUBMITTED in SAP, ACCEPTED in LHDN |
| RC-006 | Export Reconciliation Report | ❌ | `recon-report.spec.ts` | Excel export |

---

## Multi-Tenant & Multi-Entity (8 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| MT-001 | Tenant A Submits Invoice | ✅ | `multi-tenant-a.test.ts` | Basic isolation |
| MT-002 | Tenant B Submits Invoice (Isolated) | ❌ | `multi-tenant-b.test.ts` | RLS enforcement |
| MT-003 | Cross-Tenant Data Leak Test | ❌ | `rls-leak-test.spec.ts` | Security critical |
| MT-004 | Multi-Company (Same Tenant) | ❌ | `multi-company.test.ts` | Company codes 1000, 2000 |
| MT-005 | Multi-Branch (Same Company) | ❌ | `multi-branch.test.ts` | Branch A, B, C |
| MT-006 | Per-Tenant Tax Mapping | ❌ | `tenant-tax-map.test.ts` | Different mappings per tenant |
| MT-007 | Per-Tenant Rate Limits | ❌ | `tenant-rate-limit.spec.ts` | 100 req/min each |
| MT-008 | Per-Tenant Quotas | ❌ | `tenant-quotas.spec.ts` | Max 10k invoices/month |

---

## Notifications (7 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| NT-001 | Email on ACCEPTED | ❌ | `email-accepted.test.ts` | Success notification |
| NT-002 | Email on REJECTED | ❌ | `email-rejected.test.ts` | Error notification with details |
| NT-003 | Email Bounce Handling | ❌ | `email-bounce.test.ts` | Mark address as invalid |
| NT-004 | Email Throttling | ❌ | `email-throttle.test.ts` | Max 10/min per tenant |
| NT-005 | Webhook on ACCEPTED | ❌ | `webhook-accepted.test.ts` | POST to tenant URL |
| NT-006 | Webhook Retry (Failure) | ❌ | `webhook-retry.test.ts` | Exponential backoff |
| NT-007 | Webhook Signature Verification | ❌ | `webhook-signature.test.ts` | HMAC SHA-256 |

---

## Security & Compliance (10 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| SC-001 | JWT Authentication | ✅ | `auth-jwt.test.ts` | Basic auth tested |
| SC-002 | JWT Expiry (15min) | ❌ | `auth-jwt-expiry.test.ts` | Refresh required |
| SC-003 | Refresh Token Rotation | ❌ | `auth-refresh.test.ts` | 7-day refresh |
| SC-004 | CSRF Protection | ❌ | `csrf-protection.test.ts` | UI forms |
| SC-005 | XSS Prevention | ❌ | `xss-prevention.test.ts` | Input sanitization |
| SC-006 | SQL Injection Prevention | ❌ | `sql-injection.test.ts` | Parameterized queries |
| SC-007 | PII Redaction in Logs | ❌ | `pii-redaction.test.ts` | TIN, email masked |
| SC-008 | 7-Year Audit Retention | ❌ | `audit-retention.test.ts` | Policy enforcement |
| SC-009 | Audit Log Immutability | ❌ | `audit-immutable.test.ts` | No UPDATE/DELETE |
| SC-010 | Secrets in Vault (Not Code) | ❌ | `secrets-vault.test.ts` | KMS integration |

---

## UX & Accessibility (8 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| UX-001 | Submission Monitor - Desktop | ❌ | `ui-monitor-desktop.spec.ts` | 1920x1080 |
| UX-002 | Submission Monitor - 4K | ❌ | `ui-monitor-4k.spec.ts` | 3840x2160 |
| UX-003 | Exception Inbox - Keyboard Nav | ❌ | `ui-exceptions-keyboard.spec.ts` | Tab/Enter/Esc |
| UX-004 | Config Studio - Screen Reader | ❌ | `ui-config-a11y.spec.ts` | ARIA labels |
| UX-005 | Audit Explorer - Print View | ❌ | `ui-audit-print.spec.ts` | PDF export |
| UX-006 | i18n - English | ❌ | `ui-i18n-en.spec.ts` | All strings translated |
| UX-007 | i18n - Bahasa Malaysia | ❌ | `ui-i18n-ms.spec.ts` | All strings translated |
| UX-008 | Empty States Guidance | ❌ | `ui-empty-states.spec.ts` | "What to do next" copy |

---

## Load & Performance (6 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| LP-001 | 10 Concurrent Submissions | ❌ | `load-10-concurrent.js` | k6 script |
| LP-002 | 100 Concurrent Submissions | ❌ | `load-100-concurrent.js` | Stress test |
| LP-003 | 1000 Concurrent Submissions | ❌ | `load-1000-concurrent.js` | Target load |
| LP-004 | Month-End Spike (10x Traffic) | ❌ | `load-month-end.js` | Burst capacity |
| LP-005 | Large Document (999 Lines) | ❌ | `perf-large-doc.test.ts` | Response time < 5s |
| LP-006 | Database Query Performance | ❌ | `perf-db-queries.test.ts` | < 100ms per query |

---

## Integration Testing (8 scenarios)

| ID | Scenario | Status | Test File | Notes |
|----|----------|--------|-----------|-------|
| IT-001 | SAP OData Mock (Billing Doc) | ❌ | `sap-odata-mock.test.ts` | Nock/MSW |
| IT-002 | LHDN API Mock (Submit) | ❌ | `lhdn-api-mock.test.ts` | Mock server |
| IT-003 | LHDN API Mock (Status Query) | ❌ | `lhdn-status-mock.test.ts` | Mock server |
| IT-004 | Ariba API Mock | ❌ | `ariba-api-mock.test.ts` | Mock server |
| IT-005 | SuccessFactors API Mock | ❌ | `sfsf-api-mock.test.ts` | Mock server |
| IT-006 | Database Integration (Testcontainers) | ❌ | `db-integration.test.ts` | Postgres container |
| IT-007 | Redis Integration (Testcontainers) | ❌ | `redis-integration.test.ts` | Redis container |
| IT-008 | UBL XML Schema Validation | ❌ | `ubl-schema.test.ts` | XSD validation |

---

## Summary

| Category | Total | ✅ Done | 🟡 Partial | ❌ Not Started | % Complete |
|----------|-------|---------|------------|----------------|------------|
| Document Types | 7 | 1 | 0 | 6 | 14% |
| Invoice Origins | 8 | 1 | 0 | 7 | 13% |
| Tax Scenarios | 12 | 1 | 0 | 11 | 8% |
| Master Data | 10 | 4 | 1 | 5 | 40% |
| Currency & FX | 8 | 1 | 0 | 7 | 13% |
| Line Items | 9 | 3 | 0 | 6 | 33% |
| Duplicates & Idempotency | 6 | 0 | 0 | 6 | 0% |
| Invoice Lifecycle | 10 | 0 | 3 | 7 | 0% |
| Cancellation & Amendments | 7 | 0 | 0 | 7 | 0% |
| Resilience & Fault Handling | 15 | 0 | 0 | 15 | 0% |
| Reconciliation | 6 | 0 | 0 | 6 | 0% |
| Multi-Tenant & Multi-Entity | 8 | 1 | 0 | 7 | 13% |
| Notifications | 7 | 0 | 0 | 7 | 0% |
| Security & Compliance | 10 | 1 | 0 | 9 | 10% |
| UX & Accessibility | 8 | 0 | 0 | 8 | 0% |
| Load & Performance | 6 | 0 | 0 | 6 | 0% |
| Integration Testing | 8 | 0 | 0 | 8 | 0% |
| **TOTAL** | **139** | **13** | **4** | **122** | **9.4%** |

---

## Next Actions

1. **Phase 5**: Implement idempotency (IP-001 to IP-006)
2. **Phase 6**: Multi-entity support (MT-004, MT-005, MT-006)
3. **Phase 7**: Credit/Debit notes (DT-002 to DT-006)
4. **Phase 8**: Ariba/SFx bridges (OR-003 to OR-006)
5. **Phase 9**: Build all 6 UX screens (UX-001 to UX-008)
6. **Phase 10**: Resilience (RS-001 to RS-015)
7. **Phase 11**: Testing marathon (all ❌ scenarios)

**Target**: 100% scenario coverage by end of Phase 12
