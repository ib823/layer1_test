'use client';

/**
 * SoD Risk Workbench Page
 *
 * Two-pane layout for managing SoD rules:
 * - Left: Rules list with filtering and active toggles
 * - Right: Rule detail editor with validation
 * - Toolbar: Simulate, Save Draft, Publish actions
 */

import { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Form,
  Switch,
  Badge,
} from '@sap-framework/ui';
import {
  PlayCircleOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
} from '@ant-design/icons';

interface SodRule {
  id: string;
  name: string;
  description: string;
  process: 'P2P' | 'OTC' | 'R2R' | 'H2R' | 'ALL';
  severity: 'critical' | 'high' | 'medium' | 'low';
  active: boolean;
  conflictingRoles: string[];
  conflictingFunctions: string[];
  scope?: string;
  lastModified: string;
}

// Mock data - 28 seeded rules
const mockRules: SodRule[] = [
  {
    id: 'P2P-001',
    name: 'Vendor Master Creation + Bank Data Maintenance',
    description: 'Prevents users from both creating vendor masters and maintaining bank details',
    process: 'P2P',
    severity: 'critical',
    active: true,
    conflictingRoles: ['Vendor_Master_Admin', 'Bank_Data_Maintainer'],
    conflictingFunctions: ['Create Vendor', 'Change Vendor Bank'],
    lastModified: '2025-01-08',
  },
  {
    id: 'P2P-002',
    name: 'Vendor Creation + Payment Posting',
    description: 'Segregates vendor creation from payment execution',
    process: 'P2P',
    severity: 'critical',
    active: true,
    conflictingRoles: ['Vendor_Create', 'AP_Clerk'],
    conflictingFunctions: ['Create Vendor', 'Post Payment'],
    lastModified: '2025-01-08',
  },
  {
    id: 'P2P-003',
    name: 'PO Creation + PO Approval',
    description: 'Prevents self-approval of purchase orders',
    process: 'P2P',
    severity: 'high',
    active: true,
    conflictingRoles: ['PO_Creator', 'PO_Approver'],
    conflictingFunctions: ['Create PO', 'Approve PO'],
    lastModified: '2025-01-07',
  },
  {
    id: 'P2P-004',
    name: 'Goods Receipt + Invoice Verification',
    description: 'Separates goods receipt from invoice verification',
    process: 'P2P',
    severity: 'medium',
    active: true,
    conflictingRoles: ['Goods_Receipt_Clerk', 'Invoice_Verifier'],
    conflictingFunctions: ['Post GR', 'Verify Invoice'],
    lastModified: '2025-01-07',
  },
  {
    id: 'P2P-005',
    name: 'Invoice Entry + Payment Authorization',
    description: 'Prevents users from entering and authorizing their own invoices',
    process: 'P2P',
    severity: 'high',
    active: true,
    conflictingRoles: ['Invoice_Entry', 'Payment_Authorizer'],
    conflictingFunctions: ['Enter Invoice', 'Authorize Payment'],
    lastModified: '2025-01-06',
  },
  {
    id: 'OTC-001',
    name: 'Customer Master Creation + Credit Limit Setting',
    description: 'Segregates customer master creation from credit limit management',
    process: 'OTC',
    severity: 'high',
    active: true,
    conflictingRoles: ['Customer_Master', 'Credit_Manager'],
    conflictingFunctions: ['Create Customer', 'Set Credit Limit'],
    lastModified: '2025-01-08',
  },
  {
    id: 'OTC-002',
    name: 'Sales Order Creation + Pricing Override',
    description: 'Prevents users from creating orders and overriding prices',
    process: 'OTC',
    severity: 'critical',
    active: true,
    conflictingRoles: ['Sales_Order_Entry', 'Price_Override'],
    conflictingFunctions: ['Create Sales Order', 'Override Price'],
    lastModified: '2025-01-08',
  },
  {
    id: 'OTC-003',
    name: 'Billing Document + Credit Memo',
    description: 'Separates billing from credit memo creation',
    process: 'OTC',
    severity: 'medium',
    active: true,
    conflictingRoles: ['Billing_Clerk', 'Credit_Memo_Approver'],
    conflictingFunctions: ['Create Invoice', 'Issue Credit Memo'],
    lastModified: '2025-01-07',
  },
  {
    id: 'OTC-004',
    name: 'Sales Order Approval + Discount Authorization',
    description: 'Prevents users from approving orders and authorizing discounts',
    process: 'OTC',
    severity: 'high',
    active: true,
    conflictingRoles: ['SO_Approver', 'Discount_Auth'],
    conflictingFunctions: ['Approve Sales Order', 'Authorize Discount'],
    lastModified: '2025-01-06',
  },
  {
    id: 'R2R-001',
    name: 'GL Posting + GL Account Maintenance',
    description: 'Segregates GL transaction posting from chart of accounts maintenance',
    process: 'R2R',
    severity: 'high',
    active: true,
    conflictingRoles: ['GL_Accountant', 'GL_Config'],
    conflictingFunctions: ['Post GL Entry', 'Maintain COA'],
    lastModified: '2025-01-08',
  },
  {
    id: 'R2R-002',
    name: 'Journal Entry Creation + Journal Approval',
    description: 'Prevents self-approval of journal entries',
    process: 'R2R',
    severity: 'critical',
    active: true,
    conflictingRoles: ['JE_Creator', 'JE_Approver'],
    conflictingFunctions: ['Create JE', 'Approve JE'],
    lastModified: '2025-01-08',
  },
  {
    id: 'R2R-003',
    name: 'Month-End Close + GL Reporting',
    description: 'Separates period close from financial reporting',
    process: 'R2R',
    severity: 'medium',
    active: true,
    conflictingRoles: ['Close_Coordinator', 'GL_Reporter'],
    conflictingFunctions: ['Close Period', 'Generate Reports'],
    lastModified: '2025-01-07',
  },
  {
    id: 'R2R-004',
    name: 'Fixed Asset Master + Depreciation Run',
    description: 'Segregates asset master maintenance from depreciation execution',
    process: 'R2R',
    severity: 'medium',
    active: true,
    conflictingRoles: ['FA_Master', 'Depreciation_Runner'],
    conflictingFunctions: ['Maintain Asset', 'Run Depreciation'],
    lastModified: '2025-01-06',
  },
  {
    id: 'R2R-005',
    name: 'Tax Configuration + Tax Calculation',
    description: 'Prevents users from configuring and executing tax calculations',
    process: 'R2R',
    severity: 'high',
    active: true,
    conflictingRoles: ['Tax_Config', 'Tax_Processor'],
    conflictingFunctions: ['Configure Tax', 'Calculate Tax'],
    lastModified: '2025-01-05',
  },
  {
    id: 'H2R-001',
    name: 'Employee Master Creation + Payroll Execution',
    description: 'Segregates employee master data from payroll processing',
    process: 'H2R',
    severity: 'critical',
    active: true,
    conflictingRoles: ['HR_Admin', 'Payroll_Processor'],
    conflictingFunctions: ['Create Employee', 'Run Payroll'],
    lastModified: '2025-01-08',
  },
  {
    id: 'H2R-002',
    name: 'Salary Change + Payroll Approval',
    description: 'Prevents users from changing salaries and approving payroll',
    process: 'H2R',
    severity: 'critical',
    active: true,
    conflictingRoles: ['Compensation_Admin', 'Payroll_Approver'],
    conflictingFunctions: ['Adjust Salary', 'Approve Payroll'],
    lastModified: '2025-01-07',
  },
  {
    id: 'H2R-003',
    name: 'Time Entry + Time Approval',
    description: 'Separates time recording from time approval',
    process: 'H2R',
    severity: 'medium',
    active: true,
    conflictingRoles: ['Time_Recorder', 'Time_Approver'],
    conflictingFunctions: ['Enter Time', 'Approve Time'],
    lastModified: '2025-01-07',
  },
  {
    id: 'H2R-004',
    name: 'Benefits Enrollment + Benefits Administration',
    description: 'Segregates benefits enrollment from benefits administration',
    process: 'H2R',
    severity: 'medium',
    active: false,
    conflictingRoles: ['Benefits_Admin', 'Benefits_Processor'],
    conflictingFunctions: ['Enroll Benefits', 'Process Benefits'],
    lastModified: '2025-01-06',
  },
  {
    id: 'ALL-001',
    name: 'User Administration + Authorization Assignment',
    description: 'Prevents users from creating users and assigning authorizations',
    process: 'ALL',
    severity: 'critical',
    active: true,
    conflictingRoles: ['User_Admin', 'Auth_Admin'],
    conflictingFunctions: ['Create User', 'Assign Role'],
    lastModified: '2025-01-08',
  },
  {
    id: 'ALL-002',
    name: 'Security Role Creation + Role Assignment',
    description: 'Segregates role maintenance from role assignment',
    process: 'ALL',
    severity: 'critical',
    active: true,
    conflictingRoles: ['Role_Designer', 'Role_Assigner'],
    conflictingFunctions: ['Create Role', 'Assign to User'],
    lastModified: '2025-01-08',
  },
  {
    id: 'ALL-003',
    name: 'System Configuration + Production Access',
    description: 'Separates system configuration from production environment access',
    process: 'ALL',
    severity: 'high',
    active: true,
    conflictingRoles: ['Sys_Config', 'Prod_User'],
    conflictingFunctions: ['Configure System', 'Execute in Prod'],
    lastModified: '2025-01-07',
  },
  {
    id: 'ALL-004',
    name: 'Audit Log Viewing + Audit Log Deletion',
    description: 'Prevents users from viewing and deleting audit logs',
    process: 'ALL',
    severity: 'critical',
    active: true,
    conflictingRoles: ['Auditor', 'Log_Admin'],
    conflictingFunctions: ['View Logs', 'Delete Logs'],
    lastModified: '2025-01-07',
  },
  {
    id: 'P2P-006',
    name: 'Contract Creation + Contract Approval',
    description: 'Prevents self-approval of vendor contracts',
    process: 'P2P',
    severity: 'high',
    active: true,
    conflictingRoles: ['Contract_Creator', 'Contract_Approver'],
    conflictingFunctions: ['Create Contract', 'Approve Contract'],
    lastModified: '2025-01-05',
  },
  {
    id: 'P2P-007',
    name: 'Vendor Selection + PO Creation',
    description: 'Segregates vendor selection from purchase order creation',
    process: 'P2P',
    severity: 'medium',
    active: false,
    conflictingRoles: ['Sourcing_Manager', 'Buyer'],
    conflictingFunctions: ['Select Vendor', 'Create PO'],
    lastModified: '2025-01-04',
  },
  {
    id: 'OTC-005',
    name: 'Receivables Posting + Cash Application',
    description: 'Separates receivables posting from cash receipt application',
    process: 'OTC',
    severity: 'high',
    active: true,
    conflictingRoles: ['AR_Accountant', 'Cash_App_Clerk'],
    conflictingFunctions: ['Post AR', 'Apply Cash'],
    lastModified: '2025-01-05',
  },
  {
    id: 'OTC-006',
    name: 'Shipping Document + Billing Document',
    description: 'Prevents users from creating shipping and billing documents',
    process: 'OTC',
    severity: 'medium',
    active: true,
    conflictingRoles: ['Shipping_Clerk', 'Billing_Clerk'],
    conflictingFunctions: ['Create Shipment', 'Create Invoice'],
    lastModified: '2025-01-04',
  },
  {
    id: 'R2R-006',
    name: 'Bank Reconciliation + GL Posting',
    description: 'Segregates bank reconciliation from GL transaction posting',
    process: 'R2R',
    severity: 'medium',
    active: true,
    conflictingRoles: ['Bank_Recon_Analyst', 'GL_Accountant'],
    conflictingFunctions: ['Reconcile Bank', 'Post GL Entry'],
    lastModified: '2025-01-04',
  },
  {
    id: 'H2R-005',
    name: 'Termination Processing + Final Pay Authorization',
    description: 'Segregates employee termination from final pay authorization',
    process: 'H2R',
    severity: 'high',
    active: true,
    conflictingRoles: ['HR_Termination', 'Payroll_Final_Pay'],
    conflictingFunctions: ['Process Termination', 'Authorize Final Pay'],
    lastModified: '2025-01-03',
  },
];

export default function RiskWorkbenchPage() {
  const [selectedRule, setSelectedRule] = useState<SodRule | null>(mockRules[0]);
  const [filters, setFilters] = useState({
    process: undefined as string | undefined,
    severity: undefined as string | undefined,
    active: undefined as boolean | undefined,
    search: '',
  });

  const [form] = Form.useForm();

  // Filter rules based on current filters
  const filteredRules = mockRules.filter((rule) => {
    if (filters.process && rule.process !== filters.process) return false;
    if (filters.severity && rule.severity !== filters.severity) return false;
    if (filters.active !== undefined && rule.active !== filters.active) return false;
    if (
      filters.search &&
      !rule.name.toLowerCase().includes(filters.search.toLowerCase()) &&
      !rule.id.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Populate form when rule is selected
  const handleRuleSelect = (rule: SodRule) => {
    setSelectedRule(rule);
    form.setFieldsValue({
      name: rule.name,
      description: rule.description,
      process: rule.process,
      severity: rule.severity,
      active: rule.active,
      conflictingRoles: rule.conflictingRoles,
      conflictingFunctions: rule.conflictingFunctions,
      scope: rule.scope,
    });
  };

  const handleSaveDraft = () => {
    console.log('Save draft:', form.getFieldsValue());
  };

  const handlePublish = () => {
    form.validateFields().then((values) => {
      console.log('Publish rule:', values);
    });
  };

  const handleSimulate = () => {
    console.log('Simulate rule on snapshot');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Risk Workbench</h1>
          <p className="text-secondary mt-1">
            Configure and manage segregation of duties rules
          </p>
        </div>
        <Space>
          <Button icon={<PlayCircleOutlined />} onClick={handleSimulate}>
            Simulate on Snapshot
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button variant="primary" icon={<CheckCircleOutlined />} onClick={handlePublish}>
            Publish
          </Button>
        </Space>
      </div>

      {/* Two-Pane Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Pane: Rules List */}
        <div className="col-span-4 space-y-4">
          {/* Filters */}
          <Card>
            <div className="space-y-3">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search rules..."
                allowClear
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Select
                placeholder="Process"
                allowClear
                options={[
                  { label: 'Procure-to-Pay', value: 'P2P' },
                  { label: 'Order-to-Cash', value: 'OTC' },
                  { label: 'Record-to-Report', value: 'R2R' },
                  { label: 'Hire-to-Retire', value: 'H2R' },
                  { label: 'All Processes', value: 'ALL' },
                ]}
                onChange={(value) => setFilters({ ...filters, process: value })}
                className="w-full"
              />
              <Select
                placeholder="Severity"
                allowClear
                options={[
                  { label: 'Critical', value: 'critical' },
                  { label: 'High', value: 'high' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Low', value: 'low' },
                ]}
                onChange={(value) => setFilters({ ...filters, severity: value })}
                className="w-full"
              />
              <Select
                placeholder="Status"
                allowClear
                options={[
                  { label: 'Active', value: true },
                  { label: 'Inactive', value: false },
                ]}
                onChange={(value) => setFilters({ ...filters, active: value as boolean })}
                className="w-full"
              />
            </div>
          </Card>

          {/* Rules List */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>
                  Rules ({filteredRules.length}/{mockRules.length})
                </span>
                <Button variant="text" icon={<PlusOutlined />} size="small">
                  New Rule
                </Button>
              </div>
            }
            className="h-[calc(100vh-22rem)] overflow-hidden"
          >
            <div className="space-y-2 overflow-y-auto h-full">
              {filteredRules.length === 0 ? (
                <div className="text-center text-tertiary py-8">
                  <p>No rules match your filters</p>
                  <p className="text-sm mt-2">Try adjusting your search criteria</p>
                </div>
              ) : (
                filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    onClick={() => handleRuleSelect(rule)}
                    className={`
                      p-3 rounded-md cursor-pointer transition-all
                      border border-border-default
                      hover:shadow-md hover:border-brand-primary
                      ${
                        selectedRule?.id === rule.id
                          ? 'bg-brand-50 border-brand-primary shadow-sm'
                          : 'bg-surface-base'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-primary">{rule.id}</div>
                        <div className="text-xs text-secondary mt-0.5 line-clamp-2">
                          {rule.name}
                        </div>
                      </div>
                      <Badge
                        status={rule.active ? 'success' : 'default'}
                        text={rule.active ? 'Active' : 'Inactive'}
                        className="ml-2"
                      />
                    </div>
                    <Space size="small" wrap>
                      <Tag className="text-xs">{rule.process}</Tag>
                      <Tag variant={rule.severity} className="text-xs">
                        {rule.severity.toUpperCase()}
                      </Tag>
                    </Space>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Pane: Rule Editor */}
        <div className="col-span-8">
          <Card
            title={selectedRule ? `Edit Rule: ${selectedRule.id}` : 'Select a rule to edit'}
            className="h-[calc(100vh-14rem)]"
          >
            {!selectedRule ? (
              <div className="flex items-center justify-center h-full text-tertiary">
                <div className="text-center">
                  <FilterOutlined className="text-4xl mb-3" />
                  <p>Select a rule from the list to view and edit details</p>
                  <p className="text-sm mt-2">Or create a new rule to get started</p>
                </div>
              </div>
            ) : (
              <Form
                form={form}
                layout="vertical"
                className="space-y-4"
                initialValues={{
                  name: selectedRule.name,
                  description: selectedRule.description,
                  process: selectedRule.process,
                  severity: selectedRule.severity,
                  active: selectedRule.active,
                  conflictingRoles: selectedRule.conflictingRoles,
                  conflictingFunctions: selectedRule.conflictingFunctions,
                  scope: selectedRule.scope,
                }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item
                    label="Rule ID"
                    name="id"
                    initialValue={selectedRule.id}
                  >
                    <Input disabled />
                  </Form.Item>
                  <Form.Item label="Status" name="active" valuePropName="checked">
                    <Switch
                      checkedChildren="Active"
                      unCheckedChildren="Inactive"
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  label="Rule Name"
                  name="name"
                  rules={[{ required: true, message: 'Please enter rule name' }]}
                >
                  <Input placeholder="Enter descriptive rule name" />
                </Form.Item>

                <Form.Item
                  label="Description"
                  name="description"
                  rules={[{ required: true, message: 'Please enter description' }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Explain the business rationale for this rule"
                  />
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item
                    label="Business Process"
                    name="process"
                    rules={[{ required: true, message: 'Select process' }]}
                  >
                    <Select
                      options={[
                        { label: 'Procure-to-Pay', value: 'P2P' },
                        { label: 'Order-to-Cash', value: 'OTC' },
                        { label: 'Record-to-Report', value: 'R2R' },
                        { label: 'Hire-to-Retire', value: 'H2R' },
                        { label: 'All Processes', value: 'ALL' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Severity"
                    name="severity"
                    rules={[{ required: true, message: 'Select severity' }]}
                  >
                    <Select
                      options={[
                        { label: 'Critical', value: 'critical' },
                        { label: 'High', value: 'high' },
                        { label: 'Medium', value: 'medium' },
                        { label: 'Low', value: 'low' },
                      ]}
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  label="Conflicting Roles"
                  name="conflictingRoles"
                  tooltip="Roles that should not be assigned together"
                >
                  <Select
                    mode="tags"
                    placeholder="Enter role names"
                    tokenSeparators={[',']}
                  />
                </Form.Item>

                <Form.Item
                  label="Conflicting Functions"
                  name="conflictingFunctions"
                  tooltip="Specific functions/transactions that conflict"
                >
                  <Select
                    mode="tags"
                    placeholder="Enter function names"
                    tokenSeparators={[',']}
                  />
                </Form.Item>

                <Form.Item
                  label="Scope Constraints (Optional)"
                  name="scope"
                  tooltip="Additional filters (e.g., company code, cost center)"
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="e.g., Company Code = 1000, Cost Center = 4200"
                  />
                </Form.Item>

                {/* Rule Metadata */}
                <Card className="bg-surface-secondary">
                  <div className="text-xs text-tertiary">
                    <div>
                      <strong>Last Modified:</strong> {selectedRule.lastModified}
                    </div>
                    <div className="mt-1">
                      <strong>Modified By:</strong> System Admin
                    </div>
                  </div>
                </Card>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
