'use client';

/**
 * System Admin Dashboard
 * Overview of system-wide metrics and management
 */

import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Space, Button, Typography, Progress } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  DatabaseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Role } from '@/types/auth';

const { Title, Text } = Typography;

export default function AdminDashboardPage() {
  // Mock data for demonstration
  const tenantData = [
    {
      key: '1',
      name: 'Acme Corp',
      status: 'active',
      users: 145,
      violations: 23,
      lastScan: '2025-10-07',
    },
    {
      key: '2',
      name: 'TechStart Inc',
      status: 'active',
      users: 87,
      violations: 12,
      lastScan: '2025-10-07',
    },
    {
      key: '3',
      name: 'Global Solutions',
      status: 'suspended',
      users: 203,
      violations: 45,
      lastScan: '2025-10-05',
    },
  ];

  const columns = [
    {
      title: 'Tenant Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Users',
      dataIndex: 'users',
      key: 'users',
    },
    {
      title: 'Violations',
      dataIndex: 'violations',
      key: 'violations',
      render: (violations: number) => (
        <Space>
          {violations > 30 && <WarningOutlined style={{ color: '#ff4d4f' }} />}
          <Text strong={violations > 30}>{violations}</Text>
        </Space>
      ),
    },
    {
      title: 'Last Scan',
      dataIndex: 'lastScan',
      key: 'lastScan',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button type="link" size="small">View</Button>
          <Button type="link" size="small">Manage</Button>
        </Space>
      ),
    },
  ];

  return (
    <ProtectedRoute allowedRoles={[Role.SYSTEM_ADMIN]}>
      <DashboardLayout>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2}>System Admin Dashboard</Title>
            <Text type="secondary">
              System-wide overview and management
            </Text>
          </div>

          {/* Key Metrics */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Tenants"
                  value={25}
                  prefix={<DatabaseOutlined />}
                  suffix={
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      <ArrowUpOutlined /> 12%
                    </Tag>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Users"
                  value={1,435}
                  prefix={<UserOutlined />}
                  suffix={
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      <ArrowUpOutlined /> 8%
                    </Tag>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Active Violations"
                  value={234}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                  suffix={
                    <Tag color="red" style={{ marginLeft: 8 }}>
                      <ArrowUpOutlined /> 5%
                    </Tag>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="System Health"
                  value={98}
                  prefix={<SafetyOutlined />}
                  suffix="%"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* System Resources */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="System Resources" size="small">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text>CPU Usage</Text>
                    <Progress percent={45} status="active" />
                  </div>
                  <div>
                    <Text>Memory Usage</Text>
                    <Progress percent={62} status="active" strokeColor="#1890ff" />
                  </div>
                  <div>
                    <Text>Database Storage</Text>
                    <Progress percent={38} status="active" strokeColor="#52c41a" />
                  </div>
                  <div>
                    <Text>API Rate Limit</Text>
                    <Progress percent={72} status="active" strokeColor="#faad14" />
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Connector Status" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>SAP S/4HANA</Text>
                    <Tag color="green">Connected</Tag>
                  </Space>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>IPS</Text>
                    <Tag color="green">Connected</Tag>
                  </Space>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>Ariba</Text>
                    <Tag color="orange">Limited</Tag>
                  </Space>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>SuccessFactors</Text>
                    <Tag color="red">Disconnected</Tag>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Tenant List */}
          <Card
            title="Tenant Overview"
            extra={
              <Button type="primary" href="/admin/tenants">
                Manage Tenants
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={tenantData}
              pagination={false}
              size="small"
            />
          </Card>
        </Space>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
