'use client';

/**
 * SoD Violations Inbox Page
 *
 * Displays all segregation of duties violations with filtering and actions.
 * Features:
 * - Filter by risk level, process, date range
 * - Search by user/role
 * - Row click opens drawer with violation details
 * - Bulk actions (assign, remediate, accept risk)
 */

import { useState } from 'react';
import {
  Card,
  Button,
  Select,
  DatePicker,
  Input,
  Tag,
  Space,
  Drawer,
  Descriptions,
  Badge,
  TableShell,
} from '@sap-framework/ui';
import type { ColumnsType } from 'antd/es/table';
import { PageHead } from '@/components/seo/PageHead';
import {
  FilterOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';

interface Violation {
  id: string;
  user: string;
  userName: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  conflictType: string;
  roles: string[];
  functions: string[];
  process: string;
  detectedAt: string;
  status: 'open' | 'in-review' | 'remediated' | 'risk-accepted';
}

// Mock data - TODO: Replace with API call
const mockViolations: Violation[] = [
  {
    id: 'V-001',
    user: 'john.doe',
    userName: 'John Doe',
    riskLevel: 'critical',
    conflictType: 'P2P-001: Vendor Master + Bank Data',
    roles: ['Vendor_Master_Admin', 'Payment_Processor'],
    functions: ['Change Vendor Bank', 'Process Payment'],
    process: 'Procure-to-Pay',
    detectedAt: '2025-01-08 14:30',
    status: 'open',
  },
  {
    id: 'V-002',
    user: 'jane.smith',
    userName: 'Jane Smith',
    riskLevel: 'critical',
    conflictType: 'P2P-002: Vendor Creation + Payment Posting',
    roles: ['Vendor_Create', 'AP_Clerk'],
    functions: ['Create Vendor', 'Post Payment'],
    process: 'Procure-to-Pay',
    detectedAt: '2025-01-08 10:15',
    status: 'in-review',
  },
  {
    id: 'V-003',
    user: 'bob.wilson',
    userName: 'Bob Wilson',
    riskLevel: 'high',
    conflictType: 'R2R-001: GL Posting + GL Account Maintenance',
    roles: ['GL_Accountant', 'GL_Config'],
    functions: ['Post GL Entry', 'Maintain COA'],
    process: 'Record-to-Report',
    detectedAt: '2025-01-08 09:00',
    status: 'open',
  },
  {
    id: 'V-004',
    user: 'alice.chen',
    userName: 'Alice Chen',
    riskLevel: 'high',
    conflictType: 'OTC-001: Customer Master + Credit Limit',
    roles: ['Customer_Master', 'Credit_Manager'],
    functions: ['Create Customer', 'Set Credit Limit'],
    process: 'Order-to-Cash',
    detectedAt: '2025-01-07 16:45',
    status: 'open',
  },
  {
    id: 'V-005',
    user: 'mike.brown',
    userName: 'Mike Brown',
    riskLevel: 'medium',
    conflictType: 'P2P-004: Goods Receipt + Invoice Verification',
    roles: ['Goods_Receipt_Clerk', 'Invoice_Verifier'],
    functions: ['Post GR', 'Verify Invoice'],
    process: 'Procure-to-Pay',
    detectedAt: '2025-01-07 14:20',
    status: 'remediated',
  },
];

export default function ViolationsInboxPage() {
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    riskLevel: undefined as string | undefined,
    process: undefined as string | undefined,
    status: undefined as string | undefined,
    search: '',
  });

  const columns: ColumnsType<Violation> = [
    {
      title: 'Risk',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (risk: Violation['riskLevel']) => (
        <Tag variant={risk}>{risk.toUpperCase()}</Tag>
      ),
      filters: [
        { text: 'Critical', value: 'critical' },
        { text: 'High', value: 'high' },
        { text: 'Medium', value: 'medium' },
        { text: 'Low', value: 'low' },
      ],
      onFilter: (value, record) => record.riskLevel === value,
      sorter: (a, b) => {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        return order[b.riskLevel] - order[a.riskLevel];
      },
    },
    {
      title: 'User',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      sorter: (a, b) => a.userName.localeCompare(b.userName),
    },
    {
      title: 'Violation Type',
      dataIndex: 'conflictType',
      key: 'conflictType',
      ellipsis: true,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      width: 200,
      render: (roles: string[]) => (
        <Space size="small" wrap>
          {roles.slice(0, 2).map((role) => (
            <Tag key={role} className="text-xs">
              {role}
            </Tag>
          ))}
          {roles.length > 2 && <span className="text-tertiary text-xs">+{roles.length - 2}</span>}
        </Space>
      ),
    },
    {
      title: 'Process',
      dataIndex: 'process',
      key: 'process',
      width: 150,
      filters: [
        { text: 'Procure-to-Pay', value: 'Procure-to-Pay' },
        { text: 'Order-to-Cash', value: 'Order-to-Cash' },
        { text: 'Record-to-Report', value: 'Record-to-Report' },
        { text: 'Hire-to-Retire', value: 'Hire-to-Retire' },
      ],
      onFilter: (value, record) => record.process === value,
    },
    {
      title: 'Detected',
      dataIndex: 'detectedAt',
      key: 'detectedAt',
      width: 150,
      sorter: (a, b) => new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: Violation['status']) => {
        const statusMap = {
          open: { color: 'danger', label: 'Open' },
          'in-review': { color: 'warning', label: 'In Review' },
          remediated: { color: 'success', label: 'Remediated' },
          'risk-accepted': { color: 'info', label: 'Risk Accepted' },
        };
        const config = statusMap[status];
        return <Badge status={config.color as any} text={config.label} />;
      },
    },
  ];

  const handleRowClick = (record: Violation) => {
    setSelectedViolation(record);
    setDrawerOpen(true);
  };

  return (
    <>
      <PageHead
        title="SoD Violations Inbox"
        description="Manage all segregation of duties violations with filtering, search, and bulk actions"
      />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Violations Inbox</h1>
          <p className="text-secondary mt-1">
            Manage segregation of duties violations and conflicts
          </p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />}>Refresh</Button>
          <Button icon={<DownloadOutlined />}>Export CSV</Button>
          <Button variant="primary">Run Analysis</Button>
        </Space>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            placeholder="Risk Level"
            allowClear
            options={[
              { label: 'Critical', value: 'critical' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
            ]}
            onChange={(value) => setFilters({ ...filters, riskLevel: value })}
          />
          <Select
            placeholder="Process"
            allowClear
            options={[
              { label: 'Procure-to-Pay', value: 'p2p' },
              { label: 'Order-to-Cash', value: 'otc' },
              { label: 'Record-to-Report', value: 'r2r' },
              { label: 'Hire-to-Retire', value: 'h2r' },
            ]}
            onChange={(value) => setFilters({ ...filters, process: value })}
          />
          <DatePicker.RangePicker />
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search user or role..."
            allowClear
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </Card>

      {/* Violations Table */}
      <Card>
        <TableShell<Violation>
          columns={columns}
          dataSource={mockViolations}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            className: 'cursor-pointer hover:bg-surface-hover',
          })}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} violations`,
            pageSize: 10,
          }}
        />
      </Card>

      {/* Violation Detail Drawer */}
      <Drawer
        title="Violation Details"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        drawerSize="large"
      >
        {selectedViolation && (
          <div className="space-y-6">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Violation ID">
                {selectedViolation.id}
              </Descriptions.Item>
              <Descriptions.Item label="User">
                {selectedViolation.userName} ({selectedViolation.user})
              </Descriptions.Item>
              <Descriptions.Item label="Risk Level">
                <Tag variant={selectedViolation.riskLevel}>
                  {selectedViolation.riskLevel.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Conflict Type">
                {selectedViolation.conflictType}
              </Descriptions.Item>
              <Descriptions.Item label="Business Process">
                {selectedViolation.process}
              </Descriptions.Item>
              <Descriptions.Item label="Conflicting Roles">
                <Space size="small" wrap>
                  {selectedViolation.roles.map((role) => (
                    <Tag key={role}>{role}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Affected Functions">
                <Space size="small" wrap>
                  {selectedViolation.functions.map((func) => (
                    <Tag key={func} className="bg-surface-tertiary">
                      {func}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Detected At">
                {selectedViolation.detectedAt}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {selectedViolation.status.replace('-', ' ').toUpperCase()}
              </Descriptions.Item>
            </Descriptions>

            {/* Actions */}
            <div className="space-y-2">
              <h3 className="font-semibold">Remediation Actions</h3>
              <Space direction="vertical" className="w-full">
                <Button block>Assign for Review</Button>
                <Button block>Create Remediation Task</Button>
                <Button block variant="danger">
                  Remove Conflicting Role
                </Button>
                <Button block>Accept Risk (with Justification)</Button>
              </Space>
            </div>

            {/* Access Graph Path */}
            <div className="space-y-2">
              <h3 className="font-semibold">Access Graph Path</h3>
              <Card className="bg-surface-secondary">
                <div className="text-sm font-mono space-y-1">
                  <div>User: {selectedViolation.user}</div>
                  <div className="pl-4">↳ Role: {selectedViolation.roles[0]}</div>
                  <div className="pl-8">↳ Permission: {selectedViolation.functions[0]}</div>
                  <div className="pl-12 text-danger">⚠ CONFLICT</div>
                  <div className="pl-4">↳ Role: {selectedViolation.roles[1]}</div>
                  <div className="pl-8">↳ Permission: {selectedViolation.functions[1]}</div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Drawer>
      </div>
    </>
  );
}
