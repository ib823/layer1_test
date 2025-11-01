'use client';

/**
 * Audit Trail Viewer
 *
 * Comprehensive audit log viewer with filtering, search, and export
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  DatePicker,
  Button,
  Tag,
  Space,
  Typography,
  Drawer,
  Descriptions,
  message,
  Row,
  Col,
  Statistic,
} from 'antd';
import { PageHead } from '@/components/seo/PageHead';
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Event categories
const EVENT_CATEGORIES = [
  { label: 'Authentication', value: 'authentication' },
  { label: 'Authorization', value: 'authorization' },
  { label: 'Data Access', value: 'data_access' },
  { label: 'Module Operation', value: 'module_operation' },
  { label: 'Configuration', value: 'configuration' },
  { label: 'System', value: 'system' },
  { label: 'Integration', value: 'integration' },
  { label: 'Compliance', value: 'compliance' },
];

// Mock data for demonstration
const generateMockLogs = (count: number) => {
  const events = [
    'USER_LOGIN',
    'RECORD_CREATED',
    'SOD_ANALYSIS_RUN',
    'INVOICE_MATCHED',
    'CONFIG_CHANGED',
  ];
  const categories = ['authentication', 'data_access', 'module_operation', 'configuration'];
  const users = ['John Doe', 'Jane Smith', 'Admin User', 'Manager User'];

  return Array.from({ length: count }, (_, i) => ({
    id: `audit-${i}`,
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    eventType: events[Math.floor(Math.random() * events.length)],
    eventCategory: categories[Math.floor(Math.random() * categories.length)],
    userName: users[Math.floor(Math.random() * users.length)],
    userEmail: `user${i}@example.com`,
    action: ['view', 'create', 'update', 'delete'][Math.floor(Math.random() * 4)],
    description: `User performed ${events[Math.floor(Math.random() * events.length)]}`,
    success: Math.random() > 0.1,
    resourceType: ['user', 'invoice', 'violation', 'tenant'][Math.floor(Math.random() * 4)],
    resourceId: `res-${Math.floor(Math.random() * 1000)}`,
    complianceRelevant: Math.random() > 0.5,
  }));
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    failedEvents: 0,
    complianceEvents: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    eventCategory: undefined,
    dateRange: undefined,
    success: undefined,
    complianceOnly: false,
  });

  // Load mock data
  useEffect(() => {
    loadLogs();
    loadStats();
  }, [filters]);

  const loadLogs = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const mockLogs = generateMockLogs(50);
      setLogs(mockLogs);
      setLoading(false);
    }, 500);
  };

  const loadStats = async () => {
    // Simulate API call
    const mockLogs = generateMockLogs(1000);
    setStats({
      totalEvents: mockLogs.length,
      failedEvents: mockLogs.filter((l) => !l.success).length,
      complianceEvents: mockLogs.filter((l) => l.complianceRelevant).length,
    });
  };

  const handleExport = async (format: 'csv' | 'json') => {
    message.info(`Exporting audit logs as ${format.toUpperCase()}...`);
    // In real implementation, call API endpoint
    setTimeout(() => {
      message.success(`Audit logs exported successfully!`);
    }, 1000);
  };

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    },
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 180,
      render: (eventType: string) => (
        <Tag color="blue">{eventType.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'eventCategory',
      key: 'eventCategory',
      width: 140,
      render: (category: string) => (
        <Tag>{category.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'User',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color="geekblue">{action.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Resource',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'success',
      key: 'success',
      width: 100,
      render: (success: boolean) =>
        success ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Success
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Failed
          </Tag>
        ),
    },
    {
      title: 'Compliance',
      dataIndex: 'complianceRelevant',
      key: 'complianceRelevant',
      width: 110,
      render: (relevant: boolean) =>
        relevant ? <Tag color="orange">Yes</Tag> : <Tag>No</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Audit Trail"
        description="Comprehensive audit log viewer with filtering, search, and export capabilities for compliance monitoring"
      />
      <div style={{ padding: '24px' }}>
        <Title level={2}>Audit Trail</Title>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Events"
              value={stats.totalEvents}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Failed Events"
              value={stats.failedEvents}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Compliance Events"
              value={stats.complianceEvents}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="Search by user, resource, or description..."
                prefix={<SearchOutlined />}
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Event Category"
                style={{ width: '100%' }}
                options={EVENT_CATEGORIES}
                value={filters.eventCategory}
                onChange={(value) =>
                  setFilters({ ...filters, eventCategory: value })
                }
                allowClear
              />
            </Col>
            <Col span={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={filters.dateRange as any}
                onChange={(dates) =>
                  setFilters({ ...filters, dateRange: dates as any })
                }
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Status"
                style={{ width: '100%' }}
                options={[
                  { label: 'All', value: undefined },
                  { label: 'Success', value: true },
                  { label: 'Failed', value: false },
                ]}
                value={filters.success}
                onChange={(value) => setFilters({ ...filters, success: value })}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Space>
                <Button
                  type="primary"
                  icon={<FilterOutlined />}
                  onClick={loadLogs}
                >
                  Apply Filters
                </Button>
                <Button
                  onClick={() =>
                    setFilters({
                      search: '',
                      eventCategory: undefined,
                      dateRange: undefined,
                      success: undefined,
                      complianceOnly: false,
                    })
                  }
                >
                  Clear Filters
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport('csv')}
                >
                  Export CSV
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport('json')}
                >
                  Export JSON
                </Button>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            total: logs.length,
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} events`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title="Audit Log Details"
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedLog && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Event ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {dayjs(selectedLog.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="Event Type">
              <Tag color="blue">{selectedLog.eventType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              {selectedLog.eventCategory}
            </Descriptions.Item>
            <Descriptions.Item label="User">{selectedLog.userName}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedLog.userEmail}</Descriptions.Item>
            <Descriptions.Item label="Action">{selectedLog.action}</Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedLog.description}
            </Descriptions.Item>
            <Descriptions.Item label="Resource Type">
              {selectedLog.resourceType}
            </Descriptions.Item>
            <Descriptions.Item label="Resource ID">
              {selectedLog.resourceId}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {selectedLog.success ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Success
                </Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="error">
                  Failed
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Compliance Relevant">
              {selectedLog.complianceRelevant ? (
                <Tag color="orange">Yes</Tag>
              ) : (
                <Tag>No</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
      </div>
    </>
  );
}
