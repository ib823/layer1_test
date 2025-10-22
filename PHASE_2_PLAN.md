# Phase 2: P1 Enterprise Features Implementation Plan

**Date:** October 22, 2025
**Status:** Starting
**Based On:** VerifyWise Comparison Analysis + Strategic Plan

---

## Overview

Phase 2 focuses on implementing enterprise-grade features that are critical for production deployment and competitive positioning.

**Estimated Duration:** 10-15 days
**Total Estimated Code:** ~5,000-7,000 lines

---

## Priority 1: Event Logs / Audit Trail (2-3 days)

**Why First:** Foundational for compliance, used by all other features

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Application Layer                    │
│  (Controllers, Services, Middleware)                 │
└──────────────────┬──────────────────────────────────┘
                   │ Audit Events
                   ▼
┌─────────────────────────────────────────────────────┐
│              AuditLogger Service                     │
│  - Capture events                                    │
│  - Enrich with context                               │
│  - Filter sensitive data                             │
│  - Queue for async storage                           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│           AuditLog Repository (Prisma)               │
│  - Store in PostgreSQL                               │
│  - Index for fast queries                            │
│  - Retention policies                                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              Audit Trail API                         │
│  - Query audit logs                                  │
│  - Export for compliance                             │
│  - Real-time event streaming                         │
└─────────────────────────────────────────────────────┘
```

### Event Types

```typescript
type AuditEventType =
  // Authentication
  | 'USER_LOGIN' | 'USER_LOGOUT' | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGED' | 'MFA_ENABLED' | 'MFA_DISABLED'

  // Authorization
  | 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED'
  | 'ROLE_ASSIGNED' | 'ROLE_REMOVED'
  | 'ACCESS_DENIED'

  // Data Access
  | 'RECORD_VIEWED' | 'RECORD_CREATED' | 'RECORD_UPDATED' | 'RECORD_DELETED'
  | 'DATA_EXPORTED' | 'REPORT_GENERATED'

  // Module Operations
  | 'SOD_ANALYSIS_RUN' | 'VIOLATION_RESOLVED' | 'VIOLATION_ESCALATED'
  | 'GL_ANOMALY_DETECTED' | 'INVOICE_MATCHED' | 'VENDOR_FLAGGED'

  // Configuration
  | 'CONFIG_CHANGED' | 'MODULE_ACTIVATED' | 'MODULE_DEACTIVATED'
  | 'CONNECTOR_CONFIGURED' | 'TENANT_CREATED' | 'TENANT_UPDATED'

  // System Events
  | 'BACKUP_CREATED' | 'BACKUP_RESTORED'
  | 'INTEGRATION_CONFIGURED' | 'SCHEDULED_JOB_RUN'
  | 'API_KEY_CREATED' | 'API_KEY_REVOKED';
```

### Database Schema (Prisma)

```prisma
model AuditLog {
  id            String   @id @default(uuid())
  tenantId      String

  // Event identification
  eventType     String   // AuditEventType enum
  eventCategory String   // authentication, data_access, module_operation, etc.

  // Actor information
  userId        String?
  userName      String?
  userEmail     String?
  userIp        String?
  userAgent     String?

  // Target information
  resourceType  String?  // user, role, violation, invoice, etc.
  resourceId    String?
  resourceName  String?

  // Event details
  action        String   // view, create, update, delete, export, etc.
  description   String
  details       Json?    // Structured data about the event

  // Changes tracking
  changesBefore Json?    // Previous state (for updates)
  changesAfter  Json?    // New state (for creates/updates)

  // Result
  success       Boolean  @default(true)
  errorMessage  String?

  // Context
  sessionId     String?
  requestId     String?
  apiEndpoint   String?
  apiMethod     String?  // GET, POST, PUT, DELETE

  // Compliance
  complianceRelevant Boolean @default(false)
  retentionYears     Int     @default(7)

  // Timestamps
  timestamp     DateTime @default(now())
  createdAt     DateTime @default(now())

  @@index([tenantId, timestamp])
  @@index([userId, timestamp])
  @@index([eventType, timestamp])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}
```

### Implementation Files

1. **`packages/core/src/audit/AuditLogger.ts`** (~300 lines)
   - Singleton service
   - Event capture and enrichment
   - PII masking
   - Queue integration for async storage

2. **`packages/core/src/audit/EventTypes.ts`** (~150 lines)
   - Event type definitions
   - Event categories
   - Event metadata schemas

3. **`packages/core/src/audit/AuditRepository.ts`** (~200 lines)
   - Prisma-based repository
   - Query methods with filtering
   - Retention policy enforcement
   - Export functionality

4. **`packages/core/src/audit/middleware/auditMiddleware.ts`** (~100 lines)
   - Express middleware to auto-capture API requests
   - Attach audit context to requests
   - Log API access patterns

5. **`packages/api/src/controllers/AuditController.ts`** (~250 lines)
   - GET /api/audit/logs - Query audit logs
   - GET /api/audit/logs/:id - Get single log
   - POST /api/audit/export - Export logs (CSV/JSON)
   - GET /api/audit/stats - Audit statistics

6. **`packages/web/src/app/audit-logs/page.tsx`** (~400 lines)
   - Audit log viewer UI
   - Advanced filtering
   - Timeline view
   - Export functionality

---

## Priority 2: Advanced Reporting (3-5 days)

**Dependencies:** Audit trail (for report audit logs)

### Architecture

```
┌─────────────────────────────────────────────────────┐
│            Report Generator Service                  │
│  - Template engine                                   │
│  - Data aggregation                                  │
│  - PDF/DOCX generation                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ├─────► Templates
                   │       - SoD Violation Report
                   │       - GL Anomaly Report
                   │       - Invoice Matching Report
                   │       - Vendor Quality Report
                   │       - Compliance Summary
                   │       - Custom Templates
                   │
                   ├─────► Export Engines
                   │       - PDF (puppeteer)
                   │       - DOCX (html-to-docx)
                   │       - Excel (exceljs)
                   │       - CSV
                   │
                   └─────► Delivery
                           - Email (via queue)
                           - Download link
                           - Scheduled delivery
```

### Report Types

1. **SoD Violation Report**
   - Summary statistics
   - Violation details by severity
   - User risk profiles
   - Remediation recommendations

2. **GL Anomaly Report**
   - Anomaly detection results
   - Statistical analysis
   - Benford's law analysis
   - Flagged transactions

3. **Invoice Matching Report**
   - Matching statistics
   - Discrepancies found
   - Fraud alerts
   - Vendor payment patterns

4. **Vendor Quality Report**
   - Quality scores
   - Duplicate vendors
   - Data completeness
   - Risk indicators

5. **Compliance Summary (Executive)**
   - Overall compliance status
   - Module health scores
   - Critical findings
   - Trend analysis

### Implementation Files

1. **`packages/core/src/reporting/ReportGenerator.ts`** (~400 lines)
   - Template engine integration
   - Data aggregation
   - Multi-format export

2. **`packages/core/src/reporting/templates/`** (~800 lines total)
   - HTML templates for each report type
   - Handlebars/EJS for templating
   - Reusable components

3. **`packages/core/src/reporting/exporters/`** (~600 lines total)
   - `PDFExporter.ts` - Using puppeteer
   - `DOCXExporter.ts` - Using html-to-docx
   - `ExcelExporter.ts` - Using exceljs
   - `CSVExporter.ts` - Native implementation

4. **`packages/api/src/controllers/ReportingController.ts`** (~300 lines)
   - POST /api/reports/generate - Generate report
   - GET /api/reports/:id - Get report
   - GET /api/reports/:id/download - Download report
   - POST /api/reports/schedule - Schedule recurring reports

5. **`packages/core/src/reporting/ReportScheduler.ts`** (~200 lines)
   - Integration with cron jobs
   - Scheduled report generation
   - Email delivery via queue

---

## Priority 3: Automation System (5-7 days)

**Dependencies:** Audit trail (for automation audit logs), Email system (for notifications)

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              Automation Engine                       │
│  - Rule evaluation                                   │
│  - Trigger detection                                 │
│  - Action execution                                  │
│  - Error handling                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ├─────► Triggers
                   │       - Event-based (audit log events)
                   │       - Schedule-based (cron)
                   │       - Condition-based (threshold exceeded)
                   │       - Webhook-based (external systems)
                   │
                   ├─────► Conditions
                   │       - Field comparisons
                   │       - Logical operators (AND/OR/NOT)
                   │       - Time-based conditions
                   │       - Computed values
                   │
                   └─────► Actions
                           - Send email
                           - Send Slack message
                           - Create ticket (ServiceNow)
                           - Update record
                           - Run workflow
                           - Call webhook
                           - Escalate to user
```

### Automation Examples

1. **Auto-escalation of critical SoD violations**
   - Trigger: SoD violation detected with severity=CRITICAL
   - Condition: No resolution within 24 hours
   - Actions:
     - Send email to manager
     - Send Slack notification to security channel
     - Create ServiceNow ticket
     - Log escalation

2. **Fraud alert notification**
   - Trigger: Invoice matching fraud alert confidence > 80%
   - Condition: Alert type in ['DUPLICATE_INVOICE', 'SPLIT_INVOICE']
   - Actions:
     - Email AP team immediately
     - Block invoice for payment
     - Log alert in audit trail

3. **Scheduled compliance reports**
   - Trigger: Schedule (1st of month, 9 AM)
   - Condition: None
   - Actions:
     - Generate compliance report
     - Email to CFO and auditors
     - Archive in compliance folder

4. **Anomaly auto-remediation**
   - Trigger: GL anomaly detected
   - Condition: Anomaly type = 'DUPLICATE_ENTRY' AND confidence > 95%
   - Actions:
     - Create reversal journal entry (pending approval)
     - Notify GL accountant
     - Log remediation action

### Database Schema

```prisma
model Automation {
  id            String   @id @default(uuid())
  tenantId      String

  name          String
  description   String?
  enabled       Boolean  @default(true)

  // Trigger configuration
  triggerType   String   // event, schedule, condition, webhook
  triggerConfig Json     // Event type, cron expression, etc.

  // Conditions
  conditions    Json?    // Logical conditions to evaluate

  // Actions
  actions       Json     // Array of actions to execute

  // Execution tracking
  lastTriggered DateTime?
  lastSuccess   DateTime?
  executionCount Int     @default(0)
  failureCount  Int      @default(0)

  // Metadata
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([tenantId, enabled])
  @@map("automations")
}

model AutomationExecution {
  id            String   @id @default(uuid())
  automationId  String
  tenantId      String

  // Execution details
  triggeredAt   DateTime @default(now())
  triggeredBy   String?  // event type, schedule, user, etc.

  // Results
  status        String   // success, failed, partial
  duration      Int      // milliseconds

  // Actions executed
  actionsExecuted Json   // Array of action results

  // Error tracking
  error         String?
  errorStack    String?

  @@index([automationId, triggeredAt])
  @@index([tenantId, triggeredAt])
  @@map("automation_executions")
}
```

### Implementation Files

1. **`packages/core/src/automation/AutomationEngine.ts`** (~500 lines)
   - Rule evaluation engine
   - Trigger detection
   - Action orchestration
   - Error handling and retry

2. **`packages/core/src/automation/triggers/`** (~600 lines total)
   - `EventTrigger.ts` - Listen to audit log events
   - `ScheduleTrigger.ts` - Cron-based triggers
   - `ConditionTrigger.ts` - Threshold/condition evaluation
   - `WebhookTrigger.ts` - External webhooks

3. **`packages/core/src/automation/actions/`** (~700 lines total)
   - `EmailAction.ts` - Send emails
   - `SlackAction.ts` - Slack notifications
   - `ServiceNowAction.ts` - Create tickets
   - `WebhookAction.ts` - Call external APIs
   - `UpdateRecordAction.ts` - Update database records
   - `WorkflowAction.ts` - Run multi-step workflows

4. **`packages/core/src/automation/ConditionEvaluator.ts`** (~200 lines)
   - Parse and evaluate logical conditions
   - Support for complex expressions
   - Field value access

5. **`packages/api/src/controllers/AutomationController.ts`** (~350 lines)
   - GET /api/automations - List automations
   - POST /api/automations - Create automation
   - PUT /api/automations/:id - Update automation
   - DELETE /api/automations/:id - Delete automation
   - POST /api/automations/:id/test - Test automation
   - GET /api/automations/:id/executions - Execution history

6. **`packages/web/src/app/automations/page.tsx`** (~500 lines)
   - Automation builder UI
   - Drag-and-drop workflow builder
   - Trigger configuration
   - Action configuration
   - Test/preview functionality

---

## Implementation Order

### Week 1 (Days 1-3): Audit Trail
- Day 1: Database schema, AuditLogger service, EventTypes
- Day 2: Repository, API controller, middleware
- Day 3: UI (audit log viewer), testing

### Week 2 (Days 4-8): Advanced Reporting
- Day 4-5: Report generator, template engine, exporters
- Day 6: Report templates (all 5 types)
- Day 7: API controller, scheduled reports
- Day 8: Report UI, testing

### Week 3 (Days 9-15): Automation System
- Day 9-10: Automation engine, condition evaluator
- Day 11-12: Triggers (event, schedule, condition, webhook)
- Day 13: Actions (email, Slack, ServiceNow, webhook, etc.)
- Day 14-15: UI (automation builder), testing

---

## Success Criteria

### Audit Trail
- ✅ All user actions logged automatically
- ✅ 99.9% event capture rate
- ✅ Query audit logs with filters (user, date, event type, resource)
- ✅ Export audit logs for compliance (CSV, JSON)
- ✅ Real-time audit log streaming
- ✅ 7-year retention policy enforced

### Advanced Reporting
- ✅ Generate all 5 report types
- ✅ Export to PDF, DOCX, Excel, CSV
- ✅ Schedule recurring reports (daily, weekly, monthly)
- ✅ Email delivery via queue
- ✅ Report generation < 30 seconds for 10,000 records
- ✅ Custom report templates supported

### Automation System
- ✅ Create, update, delete automations via UI
- ✅ Support for all trigger types
- ✅ Support for all action types
- ✅ Condition evaluation with AND/OR/NOT
- ✅ 99% automation execution success rate
- ✅ Error handling with retry logic
- ✅ Execution history and audit logs
- ✅ Test/preview automations before activation

---

## Dependencies Required

```bash
# Reporting
pnpm add puppeteer html-to-docx exceljs handlebars

# Automation
pnpm add @slack/web-api axios

# Development
pnpm add -D @types/puppeteer @types/handlebars
```

---

## Estimated Code Output

| Feature | Lines of Code | Files |
|---------|--------------|-------|
| **Audit Trail** | ~1,400 | 7 |
| **Advanced Reporting** | ~2,300 | 12 |
| **Automation System** | ~2,850 | 15 |
| **Total** | **~6,550** | **34** |

---

## Risk Mitigation

1. **Performance Risk**: Large audit log tables
   - Mitigation: Partitioning by month, archival strategy, efficient indexes

2. **Complexity Risk**: Automation builder UI
   - Mitigation: Start with simple form-based UI, add drag-and-drop later

3. **Integration Risk**: External services (Slack, ServiceNow)
   - Mitigation: Stub implementations first, real integrations later

4. **Report Generation Performance**
   - Mitigation: Background job processing, caching, pagination

---

**Ready to begin Phase 2 implementation!**
