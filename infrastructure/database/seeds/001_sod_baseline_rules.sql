-- SoD Baseline Rules Seed Data
-- Date: 2025-10-08
-- Description: 30+ baseline SoD rules across all business processes
-- Business Processes: OTC (Order-to-Cash), P2P (Procure-to-Pay), R2R (Record-to-Report),
--                     H2R (Hire-to-Retire), TRE (Treasury), MFG (Manufacturing), BTP (SAP BTP)

-- This script assumes a tenant_id exists. Replace with actual tenant UUID when running.
-- For testing: SET app.current_tenant_id = '<your-tenant-uuid>';

-- ============================================================================
-- HELPER FUNCTION TO GET OR CREATE TENANT
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get or create a default tenant for seed data
  SELECT id INTO v_tenant_id FROM tenants WHERE tenant_id = 'DEFAULT_SEED_TENANT' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (tenant_id, company_name, status)
    VALUES ('DEFAULT_SEED_TENANT', 'Seed Data Tenant', 'ACTIVE')
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Store for use in subsequent statements
  PERFORM set_config('seed.tenant_id', v_tenant_id::text, false);
END $$;

-- ============================================================================
-- PROCURE-TO-PAY (P2P) RISKS & FUNCTIONS
-- ============================================================================

-- P2P Risks
INSERT INTO sod_risks (tenant_id, risk_code, name, description, business_process, category, severity, standard_references, created_by) VALUES
(current_setting('seed.tenant_id')::UUID, 'P2P-001', 'Vendor Master + Bank Data', 'User can create/change vendor master data AND maintain vendor bank details, enabling fraudulent payments', 'P2P', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'P2P-002', 'Vendor Creation + Payment Posting', 'User can create vendors AND post payments, enabling fictitious vendor fraud', 'P2P', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'P2P-003', 'PO Creation + PO Approval', 'User can create purchase orders AND approve them, bypassing segregation controls', 'P2P', 'Operational', 'HIGH',
'{"sox": ["COSO-3"], "iso27001": ["A.9.2.1"], "nist": ["AC-5"], "cobit": ["DSS05.04"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'P2P-004', 'Goods Receipt + Invoice Verification', 'User can post goods receipt AND verify invoice, enabling collusion or over-payment', 'P2P', 'Financial', 'HIGH',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'P2P-005', 'Change Vendor Bank + Process Payment', 'User can change vendor bank data AND process payments, enabling payment diversion', 'P2P', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'P2P-006', 'Three-Way Match Circumvention', 'User can create PO AND create vendor, enabling bypass of three-way match controls', 'P2P', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM');

-- P2P Functions
INSERT INTO sod_functions (tenant_id, function_code, name, description, category, business_process, system_type) VALUES
(current_setting('seed.tenant_id')::UUID, 'P2P_VENDOR_CREATE', 'Create Vendor Master', 'Create new vendor master records', 'Master Data', 'P2P', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'P2P_VENDOR_CHANGE', 'Change Vendor Master', 'Modify existing vendor master data', 'Master Data', 'P2P', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'P2P_VENDOR_BANK', 'Maintain Vendor Bank Data', 'Create or change vendor bank account details', 'Master Data', 'P2P', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'P2P_PO_CREATE', 'Create Purchase Order', 'Create purchase orders', 'Transaction Processing', 'P2P', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'P2P_PO_APPROVE', 'Approve Purchase Order', 'Approve purchase orders', 'Approval', 'P2P', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'P2P_GR_POST', 'Post Goods Receipt', 'Post goods receipt against PO', 'Transaction Processing', 'P2P', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'P2P_IV_VERIFY', 'Verify Invoice', 'Verify and post vendor invoices', 'Transaction Processing', 'P2P', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'P2P_PAYMENT_POST', 'Post Vendor Payment', 'Post payment to vendors', 'Transaction Processing', 'P2P', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'P2P_PAYMENT_RELEASE', 'Release Payment', 'Release payment for execution', 'Approval', 'P2P', 'S4HC');

-- ============================================================================
-- ORDER-TO-CASH (OTC) RISKS & FUNCTIONS
-- ============================================================================

-- OTC Risks
INSERT INTO sod_risks (tenant_id, risk_code, name, description, business_process, category, severity, standard_references, created_by) VALUES
(current_setting('seed.tenant_id')::UUID, 'OTC-001', 'Customer Master + Credit Limit', 'User can create customers AND set credit limits, enabling fraud', 'OTC', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'OTC-002', 'Sales Order + Pricing', 'User can create sales orders AND override pricing, enabling revenue manipulation', 'OTC', 'Financial', 'HIGH',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'OTC-003', 'Billing + AR Posting', 'User can create billing documents AND post to accounts receivable', 'OTC', 'Financial', 'HIGH',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'OTC-004', 'Credit Memo + Cash Application', 'User can issue credit memos AND apply cash, enabling revenue recognition fraud', 'OTC', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'OTC-005', 'Shipping + Billing', 'User can post goods issue (shipping) AND create billing, bypassing review', 'OTC', 'Operational', 'MEDIUM',
'{"sox": ["COSO-3"], "iso27001": ["A.9.2.1"]}', 'SYSTEM');

-- OTC Functions
INSERT INTO sod_functions (tenant_id, function_code, name, description, category, business_process, system_type) VALUES
(current_setting('seed.tenant_id')::UUID, 'OTC_CUSTOMER_CREATE', 'Create Customer Master', 'Create new customer master records', 'Master Data', 'OTC', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'OTC_CREDIT_LIMIT', 'Set Credit Limit', 'Define or change customer credit limits', 'Master Data', 'OTC', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'OTC_SO_CREATE', 'Create Sales Order', 'Create sales orders', 'Transaction Processing', 'OTC', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'OTC_PRICING_OVERRIDE', 'Override Pricing', 'Override standard pricing in sales orders', 'Transaction Processing', 'OTC', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'OTC_BILLING_CREATE', 'Create Billing Document', 'Create billing/invoice documents', 'Transaction Processing', 'OTC', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'OTC_AR_POST', 'Post to AR', 'Post to accounts receivable', 'Transaction Processing', 'OTC', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'OTC_CREDIT_MEMO', 'Issue Credit Memo', 'Issue credit memos to customers', 'Transaction Processing', 'OTC', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'OTC_CASH_APPLY', 'Apply Cash Receipt', 'Apply customer payments to invoices', 'Transaction Processing', 'OTC', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'OTC_GI_POST', 'Post Goods Issue', 'Post goods issue (shipping)', 'Transaction Processing', 'OTC', 'S4HC');

-- ============================================================================
-- RECORD-TO-REPORT (R2R) RISKS & FUNCTIONS
-- ============================================================================

-- R2R Risks
INSERT INTO sod_risks (tenant_id, risk_code, name, description, business_process, category, severity, standard_references, created_by) VALUES
(current_setting('seed.tenant_id')::UUID, 'R2R-001', 'GL Posting + GL Account Maintenance', 'User can post journal entries AND maintain GL accounts, enabling financial statement fraud', 'R2R', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'R2R-002', 'Journal Entry + Period Close', 'User can post journal entries AND close accounting periods, bypassing review', 'R2R', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'R2R-003', 'Asset Create + Asset Retirement', 'User can create assets AND retire assets, enabling asset misappropriation', 'R2R', 'Financial', 'HIGH',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'R2R-004', 'Bank Reconciliation + GL Posting', 'User can perform bank reconciliation AND post adjusting entries', 'R2R', 'Financial', 'HIGH',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM');

-- R2R Functions
INSERT INTO sod_functions (tenant_id, function_code, name, description, category, business_process, system_type) VALUES
(current_setting('seed.tenant_id')::UUID, 'R2R_GL_POST', 'Post Journal Entry', 'Post general ledger journal entries', 'Transaction Processing', 'R2R', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'R2R_GL_ACCOUNT_MAINT', 'Maintain GL Accounts', 'Create or change GL account master data', 'Master Data', 'R2R', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'R2R_PERIOD_CLOSE', 'Close Accounting Period', 'Close fiscal periods', 'Transaction Processing', 'R2R', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'R2R_ASSET_CREATE', 'Create Asset Master', 'Create fixed asset master records', 'Master Data', 'R2R', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'R2R_ASSET_RETIRE', 'Retire Asset', 'Retire or scrap fixed assets', 'Transaction Processing', 'R2R', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'R2R_BANK_RECON', 'Bank Reconciliation', 'Perform bank account reconciliation', 'Transaction Processing', 'R2R', 'S4HC');

-- ============================================================================
-- HIRE-TO-RETIRE (H2R) RISKS & FUNCTIONS
-- ============================================================================

-- H2R Risks
INSERT INTO sod_risks (tenant_id, risk_code, name, description, business_process, category, severity, standard_references, created_by) VALUES
(current_setting('seed.tenant_id')::UUID, 'H2R-001', 'Employee Master + Payroll Processing', 'User can create employees AND run payroll, enabling ghost employee fraud', 'H2R', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"], "pdpa": ["Principle-1"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'H2R-002', 'Salary Change + Payroll Approval', 'User can change employee salary AND approve payroll, bypassing controls', 'H2R', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'H2R-003', 'Time Entry + Time Approval', 'User can enter time AND approve time, enabling time fraud', 'H2R', 'Operational', 'HIGH',
'{"sox": ["COSO-3"], "iso27001": ["A.9.2.1"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'H2R-004', 'User Administration + Security Roles', 'User can create system users AND assign security roles, enabling privilege escalation', 'H2R', 'Compliance', 'CRITICAL',
'{"iso27001": ["A.9.2.1", "A.9.2.5"], "nist": ["AC-2", "AC-5"], "cobit": ["DSS05.04"]}', 'SYSTEM');

-- H2R Functions
INSERT INTO sod_functions (tenant_id, function_code, name, description, category, business_process, system_type) VALUES
(current_setting('seed.tenant_id')::UUID, 'H2R_EMP_CREATE', 'Create Employee', 'Create employee master records', 'Master Data', 'H2R', 'SFSF'),
(current_setting('seed.tenant_id')::UUID, 'H2R_PAYROLL_RUN', 'Run Payroll', 'Execute payroll processing', 'Transaction Processing', 'H2R', 'SFSF'),
(current_setting('seed.tenant_id')::UUID, 'H2R_SALARY_CHANGE', 'Change Employee Salary', 'Modify employee compensation', 'Master Data', 'H2R', 'SFSF'),
(current_setting('seed.tenant_id')::UUID, 'H2R_PAYROLL_APPROVE', 'Approve Payroll', 'Approve payroll results', 'Approval', 'H2R', 'SFSF'),
(current_setting('seed.tenant_id')::UUID, 'H2R_TIME_ENTRY', 'Enter Time', 'Record employee time entries', 'Transaction Processing', 'H2R', 'SFSF'),
(current_setting('seed.tenant_id')::UUID, 'H2R_TIME_APPROVE', 'Approve Time', 'Approve employee time entries', 'Approval', 'H2R', 'SFSF'),
(current_setting('seed.tenant_id')::UUID, 'H2R_USER_ADMIN', 'User Administration', 'Create or modify system user accounts', 'Master Data', 'H2R', 'BTP'),
(current_setting('seed.tenant_id')::UUID, 'H2R_ROLE_ASSIGN', 'Assign Security Roles', 'Assign roles and authorizations to users', 'Master Data', 'H2R', 'BTP');

-- ============================================================================
-- TREASURY (TRE) RISKS & FUNCTIONS
-- ============================================================================

-- TRE Risks
INSERT INTO sod_risks (tenant_id, risk_code, name, description, business_process, category, severity, standard_references, created_by) VALUES
(current_setting('seed.tenant_id')::UUID, 'TRE-001', 'Payment Proposal + Payment Release', 'User can create payment proposals AND release payments, enabling unauthorized transfers', 'TRE', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"], "cobit": ["DSS05.03"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'TRE-002', 'Bank Account Master + Payment Processing', 'User can create bank accounts AND process payments, enabling payment diversion', 'TRE', 'Financial', 'CRITICAL',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'TRE-003', 'Cash Forecast + Cash Transfer', 'User can forecast cash AND execute cash transfers, enabling misappropriation', 'TRE', 'Financial', 'HIGH',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"]}', 'SYSTEM');

-- TRE Functions
INSERT INTO sod_functions (tenant_id, function_code, name, description, category, business_process, system_type) VALUES
(current_setting('seed.tenant_id')::UUID, 'TRE_PAYMENT_PROPOSE', 'Create Payment Proposal', 'Create automatic payment proposals', 'Transaction Processing', 'TRE', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'TRE_PAYMENT_RELEASE', 'Release Payment', 'Release payments for execution', 'Approval', 'TRE', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'TRE_BANK_ACCOUNT', 'Maintain Bank Accounts', 'Create or change house bank accounts', 'Master Data', 'TRE', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'TRE_CASH_FORECAST', 'Cash Forecasting', 'Perform cash flow forecasting', 'Reporting', 'TRE', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'TRE_CASH_TRANSFER', 'Execute Cash Transfer', 'Transfer cash between accounts', 'Transaction Processing', 'TRE', 'S4HC');

-- ============================================================================
-- MANUFACTURING (MFG) RISKS & FUNCTIONS
-- ============================================================================

-- MFG Risks
INSERT INTO sod_risks (tenant_id, risk_code, name, description, business_process, category, severity, standard_references, created_by) VALUES
(current_setting('seed.tenant_id')::UUID, 'MFG-001', 'BOM Maintenance + Production Order', 'User can change BOM AND create production orders, enabling material fraud', 'MFG', 'Operational', 'HIGH',
'{"sox": ["COSO-3"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'MFG-002', 'Inventory Posting + Inventory Count', 'User can post inventory movements AND perform physical counts, enabling theft', 'MFG', 'Financial', 'HIGH',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"], "nist": ["AC-5"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'MFG-003', 'Material Master + Inventory Valuation', 'User can create materials AND set valuation, enabling financial manipulation', 'MFG', 'Financial', 'HIGH',
'{"sox": ["IC-17"], "iso27001": ["A.9.4.4"]}', 'SYSTEM');

-- MFG Functions
INSERT INTO sod_functions (tenant_id, function_code, name, description, category, business_process, system_type) VALUES
(current_setting('seed.tenant_id')::UUID, 'MFG_BOM_MAINT', 'Maintain BOM', 'Create or change bill of materials', 'Master Data', 'MFG', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'MFG_PROD_ORDER', 'Create Production Order', 'Create manufacturing production orders', 'Transaction Processing', 'MFG', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'MFG_INV_POST', 'Post Inventory Movement', 'Post inventory goods movements', 'Transaction Processing', 'MFG', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'MFG_INV_COUNT', 'Physical Inventory Count', 'Perform physical inventory counts', 'Transaction Processing', 'MFG', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'MFG_MATERIAL_CREATE', 'Create Material Master', 'Create material master records', 'Master Data', 'MFG', 'S4HC'),
(current_setting('seed.tenant_id')::UUID, 'MFG_VALUATION', 'Set Material Valuation', 'Define material valuation/pricing', 'Master Data', 'MFG', 'S4HC');

-- ============================================================================
-- SAP BTP & CROSS-APPLICATION (BTP) RISKS & FUNCTIONS
-- ============================================================================

-- BTP Risks
INSERT INTO sod_risks (tenant_id, risk_code, name, description, business_process, category, severity, standard_references, created_by) VALUES
(current_setting('seed.tenant_id')::UUID, 'BTP-001', 'BTP Admin + Role Collection Assignment', 'User has BTP admin rights AND can assign role collections, enabling privilege escalation', 'BTP', 'Compliance', 'CRITICAL',
'{"iso27001": ["A.9.2.1", "A.9.2.5"], "nist": ["AC-2", "AC-5", "AC-6"], "cobit": ["DSS05.04"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'BTP-002', 'API Development + Production Deployment', 'User can develop APIs AND deploy to production, bypassing review', 'BTP', 'Operational', 'HIGH',
'{"iso27001": ["A.12.1.2"], "nist": ["CM-3"], "cobit": ["BAI06.01"]}', 'SYSTEM'),

(current_setting('seed.tenant_id')::UUID, 'BTP-003', 'Database Admin + Application Development', 'User has database admin AND can develop applications, enabling data exfiltration', 'BTP', 'Compliance', 'CRITICAL',
'{"iso27001": ["A.9.4.1", "A.9.4.4"], "nist": ["AC-5", "AC-6"], "pdpa": ["Principle-1"]}', 'SYSTEM');

-- BTP Functions
INSERT INTO sod_functions (tenant_id, function_code, name, description, category, business_process, system_type) VALUES
(current_setting('seed.tenant_id')::UUID, 'BTP_ADMIN', 'BTP Administrator', 'Full BTP subaccount administrator', 'Master Data', 'BTP', 'BTP'),
(current_setting('seed.tenant_id')::UUID, 'BTP_ROLE_ASSIGN', 'Assign BTP Role Collections', 'Assign role collections to users', 'Master Data', 'BTP', 'BTP'),
(current_setting('seed.tenant_id')::UUID, 'BTP_API_DEV', 'API Development', 'Develop and test APIs', 'Transaction Processing', 'BTP', 'BTP'),
(current_setting('seed.tenant_id')::UUID, 'BTP_PROD_DEPLOY', 'Production Deployment', 'Deploy to production environment', 'Transaction Processing', 'BTP', 'BTP'),
(current_setting('seed.tenant_id')::UUID, 'BTP_DB_ADMIN', 'Database Administrator', 'Full database administrator access', 'Master Data', 'BTP', 'BTP'),
(current_setting('seed.tenant_id')::UUID, 'BTP_APP_DEV', 'Application Development', 'Develop business applications', 'Transaction Processing', 'BTP', 'BTP');

-- ============================================================================
-- SOD RULESETS (FUNCTION MAPPINGS)
-- ============================================================================

-- Get function and risk IDs for creating rulesets
DO $$
DECLARE
  v_tenant_id UUID := current_setting('seed.tenant_id')::UUID;

  -- P2P
  v_risk_p2p001 UUID; v_risk_p2p002 UUID; v_risk_p2p003 UUID; v_risk_p2p004 UUID; v_risk_p2p005 UUID; v_risk_p2p006 UUID;
  v_func_vendor_create UUID; v_func_vendor_bank UUID; v_func_po_create UUID; v_func_po_approve UUID;
  v_func_gr_post UUID; v_func_iv_verify UUID; v_func_payment_post UUID; v_func_vendor_change UUID;

  -- OTC
  v_risk_otc001 UUID; v_risk_otc002 UUID; v_risk_otc003 UUID; v_risk_otc004 UUID; v_risk_otc005 UUID;
  v_func_cust_create UUID; v_func_credit_limit UUID; v_func_so_create UUID; v_func_pricing_override UUID;
  v_func_billing_create UUID; v_func_ar_post UUID; v_func_credit_memo UUID; v_func_cash_apply UUID; v_func_gi_post UUID;

  -- R2R
  v_risk_r2r001 UUID; v_risk_r2r002 UUID; v_risk_r2r003 UUID; v_risk_r2r004 UUID;
  v_func_gl_post UUID; v_func_gl_account UUID; v_func_period_close UUID; v_func_asset_create UUID;
  v_func_asset_retire UUID; v_func_bank_recon UUID;

  -- H2R
  v_risk_h2r001 UUID; v_risk_h2r002 UUID; v_risk_h2r003 UUID; v_risk_h2r004 UUID;
  v_func_emp_create UUID; v_func_payroll_run UUID; v_func_salary_change UUID; v_func_payroll_approve UUID;
  v_func_time_entry UUID; v_func_time_approve UUID; v_func_user_admin UUID; v_func_role_assign UUID;

  -- TRE
  v_risk_tre001 UUID; v_risk_tre002 UUID; v_risk_tre003 UUID;
  v_func_payment_propose UUID; v_func_payment_release UUID; v_func_bank_account UUID;
  v_func_cash_forecast UUID; v_func_cash_transfer UUID;

  -- MFG
  v_risk_mfg001 UUID; v_risk_mfg002 UUID; v_risk_mfg003 UUID;
  v_func_bom_maint UUID; v_func_prod_order UUID; v_func_inv_post UUID;
  v_func_inv_count UUID; v_func_material_create UUID; v_func_valuation UUID;

  -- BTP
  v_risk_btp001 UUID; v_risk_btp002 UUID; v_risk_btp003 UUID;
  v_func_btp_admin UUID; v_func_btp_role_assign UUID; v_func_btp_api_dev UUID;
  v_func_btp_prod_deploy UUID; v_func_btp_db_admin UUID; v_func_btp_app_dev UUID;

BEGIN
  -- Get Risk IDs
  SELECT id INTO v_risk_p2p001 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'P2P-001';
  SELECT id INTO v_risk_p2p002 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'P2P-002';
  SELECT id INTO v_risk_p2p003 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'P2P-003';
  SELECT id INTO v_risk_p2p004 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'P2P-004';
  SELECT id INTO v_risk_p2p005 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'P2P-005';
  SELECT id INTO v_risk_p2p006 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'P2P-006';

  SELECT id INTO v_risk_otc001 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'OTC-001';
  SELECT id INTO v_risk_otc002 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'OTC-002';
  SELECT id INTO v_risk_otc003 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'OTC-003';
  SELECT id INTO v_risk_otc004 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'OTC-004';
  SELECT id INTO v_risk_otc005 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'OTC-005';

  SELECT id INTO v_risk_r2r001 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'R2R-001';
  SELECT id INTO v_risk_r2r002 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'R2R-002';
  SELECT id INTO v_risk_r2r003 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'R2R-003';
  SELECT id INTO v_risk_r2r004 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'R2R-004';

  SELECT id INTO v_risk_h2r001 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'H2R-001';
  SELECT id INTO v_risk_h2r002 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'H2R-002';
  SELECT id INTO v_risk_h2r003 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'H2R-003';
  SELECT id INTO v_risk_h2r004 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'H2R-004';

  SELECT id INTO v_risk_tre001 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'TRE-001';
  SELECT id INTO v_risk_tre002 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'TRE-002';
  SELECT id INTO v_risk_tre003 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'TRE-003';

  SELECT id INTO v_risk_mfg001 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'MFG-001';
  SELECT id INTO v_risk_mfg002 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'MFG-002';
  SELECT id INTO v_risk_mfg003 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'MFG-003';

  SELECT id INTO v_risk_btp001 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'BTP-001';
  SELECT id INTO v_risk_btp002 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'BTP-002';
  SELECT id INTO v_risk_btp003 FROM sod_risks WHERE tenant_id = v_tenant_id AND risk_code = 'BTP-003';

  -- Get Function IDs
  SELECT id INTO v_func_vendor_create FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'P2P_VENDOR_CREATE';
  SELECT id INTO v_func_vendor_change FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'P2P_VENDOR_CHANGE';
  SELECT id INTO v_func_vendor_bank FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'P2P_VENDOR_BANK';
  SELECT id INTO v_func_po_create FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'P2P_PO_CREATE';
  SELECT id INTO v_func_po_approve FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'P2P_PO_APPROVE';
  SELECT id INTO v_func_gr_post FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'P2P_GR_POST';
  SELECT id INTO v_func_iv_verify FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'P2P_IV_VERIFY';
  SELECT id INTO v_func_payment_post FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'P2P_PAYMENT_POST';

  SELECT id INTO v_func_cust_create FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_CUSTOMER_CREATE';
  SELECT id INTO v_func_credit_limit FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_CREDIT_LIMIT';
  SELECT id INTO v_func_so_create FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_SO_CREATE';
  SELECT id INTO v_func_pricing_override FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_PRICING_OVERRIDE';
  SELECT id INTO v_func_billing_create FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_BILLING_CREATE';
  SELECT id INTO v_func_ar_post FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_AR_POST';
  SELECT id INTO v_func_credit_memo FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_CREDIT_MEMO';
  SELECT id INTO v_func_cash_apply FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_CASH_APPLY';
  SELECT id INTO v_func_gi_post FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'OTC_GI_POST';

  SELECT id INTO v_func_gl_post FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'R2R_GL_POST';
  SELECT id INTO v_func_gl_account FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'R2R_GL_ACCOUNT_MAINT';
  SELECT id INTO v_func_period_close FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'R2R_PERIOD_CLOSE';
  SELECT id INTO v_func_asset_create FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'R2R_ASSET_CREATE';
  SELECT id INTO v_func_asset_retire FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'R2R_ASSET_RETIRE';
  SELECT id INTO v_func_bank_recon FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'R2R_BANK_RECON';

  SELECT id INTO v_func_emp_create FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'H2R_EMP_CREATE';
  SELECT id INTO v_func_payroll_run FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'H2R_PAYROLL_RUN';
  SELECT id INTO v_func_salary_change FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'H2R_SALARY_CHANGE';
  SELECT id INTO v_func_payroll_approve FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'H2R_PAYROLL_APPROVE';
  SELECT id INTO v_func_time_entry FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'H2R_TIME_ENTRY';
  SELECT id INTO v_func_time_approve FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'H2R_TIME_APPROVE';
  SELECT id INTO v_func_user_admin FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'H2R_USER_ADMIN';
  SELECT id INTO v_func_role_assign FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'H2R_ROLE_ASSIGN';

  SELECT id INTO v_func_payment_propose FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'TRE_PAYMENT_PROPOSE';
  SELECT id INTO v_func_payment_release FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'TRE_PAYMENT_RELEASE';
  SELECT id INTO v_func_bank_account FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'TRE_BANK_ACCOUNT';
  SELECT id INTO v_func_cash_forecast FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'TRE_CASH_FORECAST';
  SELECT id INTO v_func_cash_transfer FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'TRE_CASH_TRANSFER';

  SELECT id INTO v_func_bom_maint FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'MFG_BOM_MAINT';
  SELECT id INTO v_func_prod_order FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'MFG_PROD_ORDER';
  SELECT id INTO v_func_inv_post FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'MFG_INV_POST';
  SELECT id INTO v_func_inv_count FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'MFG_INV_COUNT';
  SELECT id INTO v_func_material_create FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'MFG_MATERIAL_CREATE';
  SELECT id INTO v_func_valuation FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'MFG_VALUATION';

  SELECT id INTO v_func_btp_admin FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'BTP_ADMIN';
  SELECT id INTO v_func_btp_role_assign FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'BTP_ROLE_ASSIGN';
  SELECT id INTO v_func_btp_api_dev FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'BTP_API_DEV';
  SELECT id INTO v_func_btp_prod_deploy FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'BTP_PROD_DEPLOY';
  SELECT id INTO v_func_btp_db_admin FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'BTP_DB_ADMIN';
  SELECT id INTO v_func_btp_app_dev FROM sod_functions WHERE tenant_id = v_tenant_id AND function_code = 'BTP_APP_DEV';

  -- Insert Rulesets (P2P)
  INSERT INTO sod_rulesets (tenant_id, risk_id, function_a_id, function_b_id, condition_type, condition_config, created_by) VALUES
  (v_tenant_id, v_risk_p2p001, v_func_vendor_create, v_func_vendor_bank, 'SAME_SCOPE', '{"field": "vendor_id", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_p2p002, v_func_vendor_create, v_func_payment_post, 'SAME_SCOPE', '{"field": "company_code", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_p2p003, v_func_po_create, v_func_po_approve, 'THRESHOLD', '{"field": "amount", "operator": "gt", "value": 10000}', 'SYSTEM'),
  (v_tenant_id, v_risk_p2p004, v_func_gr_post, v_func_iv_verify, 'SAME_SCOPE', '{"field": "po_number", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_p2p005, v_func_vendor_change, v_func_payment_post, 'TEMPORAL', '{"window_days": 7}', 'SYSTEM'),
  (v_tenant_id, v_risk_p2p006, v_func_po_create, v_func_vendor_create, 'SAME_SCOPE', '{"field": "purchasing_org", "operator": "same"}', 'SYSTEM');

  -- Insert Rulesets (OTC)
  INSERT INTO sod_rulesets (tenant_id, risk_id, function_a_id, function_b_id, condition_type, condition_config, created_by) VALUES
  (v_tenant_id, v_risk_otc001, v_func_cust_create, v_func_credit_limit, 'SAME_SCOPE', '{"field": "customer_id", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_otc002, v_func_so_create, v_func_pricing_override, 'THRESHOLD', '{"field": "amount", "operator": "gt", "value": 5000}', 'SYSTEM'),
  (v_tenant_id, v_risk_otc003, v_func_billing_create, v_func_ar_post, 'SAME_SCOPE', '{"field": "company_code", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_otc004, v_func_credit_memo, v_func_cash_apply, 'SAME_SCOPE', '{"field": "customer_id", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_otc005, v_func_gi_post, v_func_billing_create, 'SAME_SCOPE', '{"field": "sales_order", "operator": "same"}', 'SYSTEM');

  -- Insert Rulesets (R2R)
  INSERT INTO sod_rulesets (tenant_id, risk_id, function_a_id, function_b_id, condition_type, condition_config, created_by) VALUES
  (v_tenant_id, v_risk_r2r001, v_func_gl_post, v_func_gl_account, 'ALWAYS', NULL, 'SYSTEM'),
  (v_tenant_id, v_risk_r2r002, v_func_gl_post, v_func_period_close, 'ALWAYS', NULL, 'SYSTEM'),
  (v_tenant_id, v_risk_r2r003, v_func_asset_create, v_func_asset_retire, 'SAME_SCOPE', '{"field": "asset_id", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_r2r004, v_func_bank_recon, v_func_gl_post, 'SAME_SCOPE', '{"field": "company_code", "operator": "same"}', 'SYSTEM');

  -- Insert Rulesets (H2R)
  INSERT INTO sod_rulesets (tenant_id, risk_id, function_a_id, function_b_id, condition_type, condition_config, created_by) VALUES
  (v_tenant_id, v_risk_h2r001, v_func_emp_create, v_func_payroll_run, 'ALWAYS', NULL, 'SYSTEM'),
  (v_tenant_id, v_risk_h2r002, v_func_salary_change, v_func_payroll_approve, 'ALWAYS', NULL, 'SYSTEM'),
  (v_tenant_id, v_risk_h2r003, v_func_time_entry, v_func_time_approve, 'SAME_SCOPE', '{"field": "employee_id", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_h2r004, v_func_user_admin, v_func_role_assign, 'ALWAYS', NULL, 'SYSTEM');

  -- Insert Rulesets (TRE)
  INSERT INTO sod_rulesets (tenant_id, risk_id, function_a_id, function_b_id, condition_type, condition_config, created_by) VALUES
  (v_tenant_id, v_risk_tre001, v_func_payment_propose, v_func_payment_release, 'ALWAYS', NULL, 'SYSTEM'),
  (v_tenant_id, v_risk_tre002, v_func_bank_account, v_func_payment_post, 'SAME_SCOPE', '{"field": "company_code", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_tre003, v_func_cash_forecast, v_func_cash_transfer, 'ALWAYS', NULL, 'SYSTEM');

  -- Insert Rulesets (MFG)
  INSERT INTO sod_rulesets (tenant_id, risk_id, function_a_id, function_b_id, condition_type, condition_config, created_by) VALUES
  (v_tenant_id, v_risk_mfg001, v_func_bom_maint, v_func_prod_order, 'SAME_SCOPE', '{"field": "material_id", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_mfg002, v_func_inv_post, v_func_inv_count, 'SAME_SCOPE', '{"field": "storage_location", "operator": "same"}', 'SYSTEM'),
  (v_tenant_id, v_risk_mfg003, v_func_material_create, v_func_valuation, 'SAME_SCOPE', '{"field": "material_id", "operator": "same"}', 'SYSTEM');

  -- Insert Rulesets (BTP)
  INSERT INTO sod_rulesets (tenant_id, risk_id, function_a_id, function_b_id, condition_type, condition_config, created_by) VALUES
  (v_tenant_id, v_risk_btp001, v_func_btp_admin, v_func_btp_role_assign, 'ALWAYS', NULL, 'SYSTEM'),
  (v_tenant_id, v_risk_btp002, v_func_btp_api_dev, v_func_btp_prod_deploy, 'ALWAYS', NULL, 'SYSTEM'),
  (v_tenant_id, v_risk_btp003, v_func_btp_db_admin, v_func_btp_app_dev, 'ALWAYS', NULL, 'SYSTEM');

END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Display summary of seeded rules
DO $$
DECLARE
  v_tenant_id UUID := current_setting('seed.tenant_id')::UUID;
  v_risk_count INTEGER;
  v_function_count INTEGER;
  v_ruleset_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_risk_count FROM sod_risks WHERE tenant_id = v_tenant_id;
  SELECT COUNT(*) INTO v_function_count FROM sod_functions WHERE tenant_id = v_tenant_id;
  SELECT COUNT(*) INTO v_ruleset_count FROM sod_rulesets WHERE tenant_id = v_tenant_id;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SoD Baseline Rules Seeded Successfully';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'Risks Seeded: %', v_risk_count;
  RAISE NOTICE 'Functions Seeded: %', v_function_count;
  RAISE NOTICE 'Rulesets Seeded: %', v_ruleset_count;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Business Processes Covered:';
  RAISE NOTICE '  - P2P (Procure-to-Pay): 6 risks';
  RAISE NOTICE '  - OTC (Order-to-Cash): 5 risks';
  RAISE NOTICE '  - R2R (Record-to-Report): 4 risks';
  RAISE NOTICE '  - H2R (Hire-to-Retire): 4 risks';
  RAISE NOTICE '  - TRE (Treasury): 3 risks';
  RAISE NOTICE '  - MFG (Manufacturing): 3 risks';
  RAISE NOTICE '  - BTP (SAP BTP): 3 risks';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total: 28 risks across 7 business processes';
  RAISE NOTICE '============================================';
END $$;
