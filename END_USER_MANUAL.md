# 👤 SAP MVP Framework - End User Manual

**Version:** 1.0.0
**Last Updated:** 2025-10-05
**Audience:** Compliance Officers, Auditors, Risk Analysts, Security Teams

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Viewing Violations](#viewing-violations)
5. [Understanding SoD Analysis](#understanding-sod-analysis)
6. [Managing Violations](#managing-violations)
7. [Analytics & Reports](#analytics--reports)
8. [Exporting Data](#exporting-data)
9. [FAQ](#faq)

---

## 1. Introduction

### What is the SAP MVP Framework?

The SAP MVP Framework helps you:
- **Identify access risks** in your SAP environment
- **Detect conflicts** where users have incompatible role combinations
- **Track remediation** of security violations
- **Ensure compliance** with Segregation of Duties (SoD) policies

### Who Should Use This System?

- **Compliance Officers** - Monitor overall compliance posture
- **Auditors** - Review access violations for audit reports
- **Risk Analysts** - Assess and prioritize risk mitigation
- **Security Teams** - Remediate violations and manage access

### Key Concepts

**Segregation of Duties (SoD):**
A security principle that prevents a single user from having permissions that create fraud risk or errors.

**Example:**
- ❌ **Violation:** User can both create invoices AND approve payments
- ✅ **Compliant:** User can create invoices, but different user approves payments

**Risk Levels:**
- 🔴 **HIGH** - Critical business risk (e.g., can commit fraud)
- 🟡 **MEDIUM** - Moderate risk (e.g., can bypass controls)
- 🟢 **LOW** - Minor risk (informational)

---

## 2. Getting Started

### Accessing the System

**Web Dashboard:**
```
https://your-company.sap-mvp.com/dashboard
```

**Login:**
1. Navigate to the dashboard URL
2. Click "Login with SAP BTP"
3. Enter your SAP credentials
4. You'll be redirected to the dashboard

**First Time Login:**
- Your administrator will assign you appropriate permissions
- You'll see violations for your tenant only
- Contact your admin if you don't see expected data

### User Roles & Permissions

| Role | Can View | Can Update | Can Export |
|------|----------|------------|------------|
| **Viewer** | ✅ Violations | ❌ No | ❌ No |
| **Analyst** | ✅ Violations | ✅ Yes (status, notes) | ✅ Yes |
| **Admin** | ✅ All data | ✅ All updates | ✅ Yes |

---

## 3. Dashboard Overview

### Accessing the Dashboard

```
Navigate to: /dashboard
```

### Dashboard Sections

```
┌─────────────────────────────────────────────────────────────────┐
│  SAP MVP FRAMEWORK DASHBOARD                                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total        │ Critical     │ Users        │ Compliance   │
│ Violations   │ Issues       │ Analyzed     │ Score        │
│              │              │              │              │
│    127       │     45       │   1,250      │    92%       │
│  +12% ▲      │  +8% ▲       │              │  +3% ▲       │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────────┐ ┌────────────────────────────┐
│  Quick Actions              │ │  System Status             │
│                             │ │                            │
│  📊 View Violations         │ │  🟢 Database: Active       │
│  📈 Analytics               │ │  🟢 SAP Connector: Online  │
│  📥 Export Data             │ │  🕐 Last Analysis: 2h ago  │
└─────────────────────────────┘ └────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Recent Violations (Top 10)                                  │
│  ┌──────────┬─────────────┬──────────┬────────────────────┐ │
│  │ User     │ Risk Level  │ Status   │ Conflict Type      │ │
│  ├──────────┼─────────────┼──────────┼────────────────────┤ │
│  │ USER001  │ 🔴 HIGH     │ OPEN     │ AP_AR_SEGREGATION  │ │
│  │ USER045  │ 🔴 HIGH     │ OPEN     │ CREATE_APPROVE_PO  │ │
│  │ USER092  │ 🟡 MEDIUM   │ OPEN     │ ROLE_OVERLAP       │ │
│  └──────────┴─────────────┴──────────┴────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Key Performance Indicators (KPIs)

**Total Violations:**
- Number of SoD conflicts detected
- Trend compared to last month

**Critical Issues:**
- Count of HIGH risk violations
- Requires immediate attention

**Users Analyzed:**
- Total SAP users scanned
- Includes active and inactive users

**Compliance Score:**
- Percentage of users with no violations
- Formula: `(Users Without Violations / Total Users) * 100`

---

## 4. Viewing Violations

### Accessing Violations List

```
Navigate to: /violations
```

### Violations List View

```
┌─────────────────────────────────────────────────────────────────┐
│  SoD Violations                                    🔍 Search    │
└─────────────────────────────────────────────────────────────────┘

Filters:  [Risk Level ▼]  [Status ▼]  [Department ▼]  [Apply]

┌───────────────────────────────────────────────────────────────────────────────┐
│ User ID    │ User Name    │ Email             │ Risk   │ Status      │ Actions│
├───────────────────────────────────────────────────────────────────────────────┤
│ USER001    │ John Smith   │ john@acme.com     │ 🔴 HIGH│ OPEN        │ View   │
│ USER045    │ Jane Doe     │ jane@acme.com     │ 🔴 HIGH│ REMEDIATED  │ View   │
│ USER092    │ Bob Johnson  │ bob@acme.com      │ 🟡 MED │ OPEN        │ View   │
│ USER134    │ Alice Brown  │ alice@acme.com    │ 🟡 MED │ ACKNOWLEDGED│ View   │
│ USER201    │ Charlie Lee  │ charlie@acme.com  │ 🟢 LOW │ OPEN        │ View   │
└───────────────────────────────────────────────────────────────────────────────┘

Showing 1-50 of 127 violations                    [← Prev] [Next →]
```

### Filtering Violations

**By Risk Level:**
```
Click: [Risk Level ▼]
Select: HIGH / MEDIUM / LOW / All
```

**By Status:**
```
Click: [Status ▼]
Select:
- OPEN - Not yet addressed
- ACKNOWLEDGED - Reviewed by analyst
- REMEDIATED - Roles removed/changed
- ACCEPTED_RISK - Risk accepted by management
```

**By Department:**
```
Click: [Department ▼]
Select: Finance / HR / Sales / IT / All
```

**By Date Range:**
```
Detected: [From Date] to [To Date]
```

### Searching Violations

**Search by:**
- User ID
- User name
- Email address
- Conflicting role names

**Example:**
```
Search box: "john"
Results: All users with "john" in name/email
```

---

## 5. Understanding SoD Analysis

### How Analysis Works

```
┌─────────────────────────────────────────────────────────────────┐
│  SOD ANALYSIS PROCESS                                            │
└─────────────────────────────────────────────────────────────────┘

Step 1: FETCH USERS
   System retrieves all users from SAP
   → 1,250 users found

Step 2: FETCH ROLES
   For each user, system gets their role assignments
   → User001: [SAP_FI_AP_CLERK, SAP_FI_AR_CLERK, SAP_FI_ACCOUNTANT]

Step 3: EVALUATE RULES
   System checks each user against SoD rules
   → 45 SoD rules configured

Step 4: DETECT VIOLATIONS
   ⚠️ User001 has conflicting roles!
   → SAP_FI_AP_CLERK (Accounts Payable)
   → SAP_FI_AR_CLERK (Accounts Receivable)
   → Risk: User can create AND receive payments

Step 5: STORE & REPORT
   Violation saved to database
   → Status: OPEN
   → Risk Level: HIGH
   → Detected: 2025-10-05 10:30
```

### Common Violation Types

#### 1. AP_AR_SEGREGATION

**Description:** User has both Accounts Payable and Accounts Receivable access

**Conflicting Roles:**
- `SAP_FI_AP_CLERK` - Can create vendor invoices
- `SAP_FI_AR_CLERK` - Can receive customer payments

**Risk:** User could create fake vendor, approve invoice, and receive payment

**Risk Level:** 🔴 HIGH

**Remediation:** Remove one of the conflicting roles

---

#### 2. CREATE_APPROVE_PO

**Description:** User can both create and approve purchase orders

**Conflicting Roles:**
- `SAP_MM_PO_CREATE` - Can create POs
- `SAP_MM_PO_APPROVE` - Can approve POs

**Risk:** User could create unauthorized purchases and approve them

**Risk Level:** 🔴 HIGH

**Remediation:** Implement dual control (separate creator and approver)

---

#### 3. VENDOR_MASTER_PAYMENT

**Description:** User can both maintain vendor master data and process payments

**Conflicting Roles:**
- `SAP_FI_VENDOR_MASTER` - Can create/edit vendors
- `SAP_FI_PAYMENT_PROCESSOR` - Can execute payments

**Risk:** User could add fake vendor and send payment

**Risk Level:** 🔴 HIGH

**Remediation:** Split duties between different users

---

#### 4. USER_ADMIN_SUPER

**Description:** User has both user administration and super user privileges

**Conflicting Roles:**
- `SAP_BASIS_USER_ADMIN` - Can create users
- `SAP_ALL` - Super user access

**Risk:** Excessive privileges, can bypass all controls

**Risk Level:** 🟡 MEDIUM

**Remediation:** Remove SAP_ALL, grant specific authorizations only

---

#### 5. PAYROLL_HR_MASTER

**Description:** User can modify employee master data and process payroll

**Conflicting Roles:**
- `SAP_HR_EMPLOYEE_MASTER` - Can edit employee records
- `SAP_HR_PAYROLL_PROCESSOR` - Can run payroll

**Risk:** User could modify their own salary and process payment

**Risk Level:** 🔴 HIGH

**Remediation:** Separate HR master data and payroll processing

---

### Risk Scoring

**HIGH Risk (Critical):**
- Direct fraud potential
- Financial impact > $100,000
- Regulatory violation (SOX, GDPR)
- Requires immediate remediation

**MEDIUM Risk (Significant):**
- Moderate fraud potential
- Can bypass controls
- Financial impact $10,000 - $100,000
- Should remediate within 30 days

**LOW Risk (Informational):**
- Minor control weakness
- Limited financial impact
- Best practice improvement
- Review and document decision

---

## 6. Managing Violations

### Viewing Violation Details

```
Click "View" on any violation in the list
Navigate to: /violations/:id
```

### Violation Detail Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  Violation Details                              ID: V-00127      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USER INFORMATION                                                 │
├─────────────────────────────────────────────────────────────────┤
│  User ID:        USER001                                        │
│  Name:           John Smith                                     │
│  Email:          john.smith@acme.com                            │
│  Department:     Finance                                        │
│  Manager:        Jane Doe (MANAGER001)                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ VIOLATION DETAILS                                                │
├─────────────────────────────────────────────────────────────────┤
│  Conflict Type:  AP_AR_SEGREGATION                              │
│  Risk Level:     🔴 HIGH                                         │
│  Status:         OPEN                                           │
│  Detected:       2025-10-05 10:30:15                            │
│                                                                  │
│  Description:                                                    │
│  User has both Accounts Payable and Accounts Receivable roles,  │
│  creating a risk of fraudulent payment processing.              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CONFLICTING ROLES                                                │
├─────────────────────────────────────────────────────────────────┤
│  • SAP_FI_AP_CLERK        (Accounts Payable Clerk)              │
│  • SAP_FI_AR_CLERK        (Accounts Receivable Clerk)           │
│  • SAP_FI_ACCOUNTANT      (General Accountant)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AFFECTED TRANSACTIONS                                            │
├─────────────────────────────────────────────────────────────────┤
│  • FB60 - Enter Vendor Invoice                                  │
│  • F-53 - Post Customer Invoice                                 │
│  • F110 - Payment Run                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ RECOMMENDED REMEDIATION                                          │
├─────────────────────────────────────────────────────────────────┤
│  Option 1: Remove SAP_FI_AR_CLERK role                          │
│  Option 2: Remove SAP_FI_AP_CLERK role                          │
│  Option 3: Transfer user to different department                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ACTIONS                                                          │
├─────────────────────────────────────────────────────────────────┤
│  [Acknowledge]  [Mark as Remediated]  [Accept Risk]  [Export]  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REMEDIATION NOTES                                                │
├─────────────────────────────────────────────────────────────────┤
│  [Text area for analyst notes]                                  │
│                                                                  │
│  [Save Notes]                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Acknowledging a Violation

**When to use:** You've reviewed the violation and plan to remediate it.

**Steps:**
1. Click "Acknowledge" button
2. Enter your name/email (auto-filled from login)
3. Add notes (optional): "Working with user's manager to remove AP role"
4. Click "Confirm"

**Result:**
- Status changes to "ACKNOWLEDGED"
- Acknowledged_by and acknowledged_at fields populated
- Violation remains in reports but marked as "in progress"

**API Call (for advanced users):**
```bash
PUT /api/modules/sod/violations/:id
Content-Type: application/json

{
  "status": "ACKNOWLEDGED",
  "remediation_notes": "Contacted manager, removal scheduled for next week"
}
```

### Marking as Remediated

**When to use:** Violation has been fixed (roles removed/changed).

**Steps:**
1. Click "Mark as Remediated" button
2. Enter remediation details:
   - What was done? (e.g., "Removed SAP_FI_AR_CLERK role")
   - When? (auto-filled with current timestamp)
   - Who performed remediation? (auto-filled from login)
3. Attach evidence (optional): Screenshot of SAP role change
4. Click "Confirm"

**Result:**
- Status changes to "REMEDIATED"
- Resolved_by and resolved_at fields populated
- Violation no longer appears in "Open Violations" reports
- Violation archived for audit history

**Verification:**
System will automatically re-analyze user in next scheduled run to confirm violation no longer exists.

### Accepting Risk

**When to use:** Management has reviewed and accepted the risk (exception granted).

**Steps:**
1. Click "Accept Risk" button
2. Enter risk acceptance justification:
   - Business reason (e.g., "Small company, no other qualified staff")
   - Compensating controls (e.g., "Manager reviews all transactions weekly")
   - Approval authority (e.g., "CFO approval attached")
3. Set expiration date (e.g., "Risk accepted until 2026-01-01")
4. Upload approval documentation (required)
5. Click "Confirm"

**Result:**
- Status changes to "ACCEPTED_RISK"
- Violation remains in database but excluded from KPI calculations
- Audit trail maintained
- System sends reminder 30 days before expiration

**⚠️ Important:** Risk acceptances must be reviewed annually or when:
- User changes departments
- User gets promoted
- Business process changes
- Regulatory requirements change

---

## 7. Analytics & Reports

### Accessing Analytics

```
Navigate to: /analytics
```

### Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  ANALYTICS & INSIGHTS                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Violations Trend (Last 6 Months)                                │
│                                                                  │
│   150 │                                            ╭─╮           │
│       │                                   ╭─╮      │ │           │
│   100 │                          ╭─╮      │ │      │ │           │
│       │                 ╭─╮      │ │      │ │      │ │           │
│    50 │        ╭─╮      │ │      │ │      │ │      │ │           │
│       │───┬────┼─┼──────┼─┼──────┼─┼──────┼─┼──────┼─┼───        │
│         May   Jun   Jul   Aug   Sep   Oct                        │
│                                                                  │
│   📈 Trend: +15% increase over last 3 months                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Risk Heat Map (By Department)                                   │
│                                                                  │
│   Finance       ████████████████████  (45 HIGH)                 │
│   Procurement   ████████████          (28 HIGH)                 │
│   HR            ████████              (18 HIGH)                 │
│   IT            ████                  (12 MEDIUM)               │
│   Sales         ██                    (8 MEDIUM)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Top 10 Violation Types                                          │
│                                                                  │
│   1. AP_AR_SEGREGATION           32 violations                  │
│   2. CREATE_APPROVE_PO           28 violations                  │
│   3. VENDOR_MASTER_PAYMENT       18 violations                  │
│   4. PAYROLL_HR_MASTER           15 violations                  │
│   5. USER_ADMIN_SUPER            12 violations                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Remediation Performance                                         │
│                                                                  │
│   Average Time to Remediate:     14 days                        │
│   Remediated This Month:         18 violations                  │
│   Still Open (>30 days):         23 violations ⚠️                │
└─────────────────────────────────────────────────────────────────┘
```

### Compliance Score Details

**Calculation:**
```
Compliance Score = (Users Without Violations / Total Active Users) × 100

Example:
Total Active Users: 1,250
Users With Violations: 95
Users Without Violations: 1,155

Compliance Score = (1,155 / 1,250) × 100 = 92.4%
```

**Benchmarks:**
- 95-100% - Excellent ✅
- 85-94% - Good 🟢
- 70-84% - Needs Improvement 🟡
- <70% - Critical ⚠️

---

## 8. Exporting Data

### CSV Export

**Exporting All Violations:**
```
1. Navigate to: /violations
2. Click "Export" button (top right)
3. Select format: CSV
4. Click "Download"
```

**CSV Format:**
```csv
user_id,user_name,user_email,department,risk_level,status,conflict_type,conflicting_roles,detected_at,remediation_notes
USER001,John Smith,john@acme.com,Finance,HIGH,OPEN,AP_AR_SEGREGATION,"SAP_FI_AP_CLERK,SAP_FI_AR_CLERK",2025-10-05 10:30:15,""
USER045,Jane Doe,jane@acme.com,Finance,HIGH,REMEDIATED,CREATE_APPROVE_PO,"SAP_MM_PO_CREATE,SAP_MM_PO_APPROVE",2025-09-28 14:22:00,"Removed PO approval role"
...
```

**Exporting Filtered Data:**
```
1. Apply filters (risk level, status, department)
2. Click "Export Filtered Results"
3. Download CSV with only filtered violations
```

### API Export (Advanced)

```bash
GET /api/modules/sod/export?tenant_id=acme&format=csv&risk_level=HIGH

# Response:
Content-Type: text/csv
Content-Disposition: attachment; filename="sod_violations_20251005.csv"

[CSV data]
```

### Excel Export (Planned v1.1)

**Future Feature:**
- Excel format with multiple sheets
- Charts and pivot tables included
- Formatted for audit reports

---

## 9. FAQ

### General Questions

**Q: How often does the system run SoD analysis?**
A: Analysis runs:
- On-demand (when you click "Run Analysis")
- Scheduled (daily at 2 AM by default)
- After significant role changes (if configured)

**Q: Can I analyze specific users only?**
A: Currently, analysis runs for all active users. Filtering by user/department will be added in v1.1.

**Q: How long does analysis take?**
A: Depends on number of users:
- 100 users: ~10 seconds
- 1,000 users: ~45 seconds
- 10,000 users: ~8 minutes

---

### Violation Management

**Q: What's the difference between "Acknowledged" and "Remediated"?**
A:
- **Acknowledged**: You've seen the violation and plan to fix it (in progress)
- **Remediated**: Violation is completely fixed (roles removed/changed)

**Q: Can I bulk update violation status?**
A: Not currently. Planned for v1.1. For now, use API for bulk updates.

**Q: What happens when I accept a risk?**
A: Violation status changes to "ACCEPTED_RISK" and is excluded from compliance score. However, it remains in the database for audit history.

**Q: Can I undo "Accept Risk"?**
A: Yes. Change status back to "OPEN" or "ACKNOWLEDGED". Risk acceptance history is preserved.

---

### Reporting & Analytics

**Q: Can I see historical violations?**
A: Yes. All violations are preserved even after remediation. Use date filters to view historical data.

**Q: Can I create custom reports?**
A: Built-in reports are provided. For custom reports, export CSV and use Excel/Power BI. GraphQL API (planned v2.0) will enable custom reporting.

**Q: Can I schedule automatic report emails?**
A: Not currently. Planned for v1.1. For now, export manually and email.

---

### Technical Questions

**Q: Why do I see "Authentication Required" error?**
A: Your session has expired. Click "Login" again to get a new token.

**Q: Can I access the system via mobile?**
A: Web interface is responsive and works on tablets. Mobile app planned for v2.0.

**Q: Is my data secure?**
A: Yes. System uses:
- AES-256-GCM encryption for credentials
- JWT authentication
- Role-based access control
- Audit logging for all actions

**Q: Can I integrate with other systems?**
A: Yes. REST API available at `/api/*`. API documentation at `/api-docs`.

---

### Troubleshooting

**Q: I don't see any violations. Why?**
A: Possible reasons:
1. Analysis hasn't run yet (check dashboard "Last Analysis" time)
2. You don't have permission to view violations
3. Your tenant has no violations (great!)
4. Filters are hiding results (reset filters)

**Q: Violation count doesn't match what I see in SAP?**
A: System analyzes data at a point in time. If roles changed in SAP after analysis, re-run analysis to get latest data.

**Q: Export is taking a long time. Is it stuck?**
A: Large exports (>1000 violations) may take 30-60 seconds. Wait for download to start. If no download after 2 minutes, contact support.

**Q: I updated a violation status but it's not reflected. Why?**
A: Browser cache issue. Try:
1. Refresh page (F5)
2. Clear browser cache
3. Log out and log back in

---

## 📞 Support

**Need Help?**
- **Documentation:** Check `/docs` directory
- **API Docs:** `http://localhost:3000/api-docs`
- **Contact Admin:** Your system administrator
- **Technical Support:** ikmal.baharudin@gmail.com

**Reporting Bugs:**
1. Describe what you were trying to do
2. Include error message (if any)
3. Attach screenshot
4. Note the timestamp
5. Email to support

---

**End of End User Manual**
