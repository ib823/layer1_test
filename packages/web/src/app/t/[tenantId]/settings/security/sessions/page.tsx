'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Typography, Popconfirm, message, Modal } from 'antd';
import {
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

interface SessionInfo {
  sessionId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ipAddress: string;
  city?: string;
  country?: string;
  createdAt: string;
  lastActivityAt: string;
  mfaVerified: boolean;
  isTrustedDevice: boolean;
  isCurrent?: boolean;
}

export default function SessionsPage() {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      message.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('Session revoked successfully');
        await fetchSessions();
      } else {
        throw new Error('Failed to revoke session');
      }
    } catch (error) {
      message.error('Failed to revoke session');
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      const response = await fetch('/api/sessions/revoke-others', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        message.success(`${data.revokedCount} session(s) revoked`);
        await fetchSessions();
      } else {
        throw new Error('Failed to revoke sessions');
      }
    } catch (error) {
      message.error('Failed to revoke other sessions');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <MobileOutlined />;
      case 'tablet':
        return <TabletOutlined />;
      default:
        return <LaptopOutlined />;
    }
  };

  const showSessionDetails = (session: SessionInfo) => {
    setSelectedSession(session);
    setDetailsVisible(true);
  };

  const columns: ColumnsType<SessionInfo> = [
    {
      title: 'Device',
      key: 'device',
      render: (_, record) => (
        <Space>
          {getDeviceIcon(record.deviceType)}
          <div>
            <div>
              <Text strong>{record.deviceName}</Text>
              {record.isCurrent && (
                <Tag color="green" style={{ marginLeft: '8px' }}>
                  Current Session
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.browser} • {record.os}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <Space>
          <EnvironmentOutlined />
          <div>
            <div>{record.city && record.country ? `${record.city}, ${record.country}` : record.country || 'Unknown'}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.ipAddress}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Last Active',
      key: 'lastActive',
      render: (_, record) => (
        <div>
          <div>{dayjs(record.lastActivityAt).fromNow()}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(record.lastActivityAt).format('MMM D, YYYY HH:mm')}
          </Text>
        </div>
      ),
      sorter: (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Security',
      key: 'security',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.mfaVerified && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              MFA Verified
            </Tag>
          )}
          {record.isTrustedDevice && (
            <Tag color="blue" icon={<SafetyOutlined />}>
              Trusted Device
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => showSessionDetails(record)}>
            Details
          </Button>
          {!record.isCurrent && (
            <Popconfirm
              title="Revoke this session?"
              description="The user will be signed out from this device."
              onConfirm={() => handleRevokeSession(record.sessionId)}
              okText="Yes, revoke"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Revoke
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const activeSessions = sessions.filter((s) => !s.isCurrent);
  const currentSession = sessions.find((s) => s.isCurrent);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <SafetyOutlined /> Active Sessions
          </Title>
          <Paragraph type="secondary">
            Manage your active sessions across all devices. You can revoke access from any device at any time.
          </Paragraph>
        </div>
        {activeSessions.length > 0 && (
          <Popconfirm
            title="Revoke all other sessions?"
            description={`This will sign you out from ${activeSessions.length} other device(s).`}
            onConfirm={handleRevokeAllOthers}
            okText="Yes, revoke all"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button danger icon={<DeleteOutlined />}>
              Revoke All Others
            </Button>
          </Popconfirm>
        )}
      </div>

      {/* Summary Cards */}
      <Space direction="horizontal" size="large" style={{ marginBottom: '24px', width: '100%' }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              {sessions.length}
            </Title>
            <Text type="secondary">Total Sessions</Text>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
              {sessions.filter((s) => s.mfaVerified).length}
            </Title>
            <Text type="secondary">MFA Verified</Text>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0, color: '#faad14' }}>
              {sessions.filter((s) => s.isTrustedDevice).length}
            </Title>
            <Text type="secondary">Trusted Devices</Text>
          </div>
        </Card>
      </Space>

      {/* Sessions Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={sessions}
          loading={loading}
          rowKey="sessionId"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Session Details Modal */}
      <Modal
        title="Session Details"
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        width={600}
        footer={
          <Space>
            <Button onClick={() => setDetailsVisible(false)}>Close</Button>
            {selectedSession && !selectedSession.isCurrent && (
              <Popconfirm
                title="Revoke this session?"
                description="The user will be signed out from this device."
                onConfirm={() => {
                  handleRevokeSession(selectedSession.sessionId);
                  setDetailsVisible(false);
                }}
                okText="Yes, revoke"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Revoke Session
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        {selectedSession && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Device</Text>
              <div style={{ marginTop: '8px' }}>
                <Space>
                  {getDeviceIcon(selectedSession.deviceType)}
                  <Text strong style={{ fontSize: '16px' }}>
                    {selectedSession.deviceName}
                  </Text>
                </Space>
              </div>
            </div>

            <div>
              <Text type="secondary">Browser & OS</Text>
              <div style={{ marginTop: '8px' }}>
                <Text>{selectedSession.browser}</Text>
                <br />
                <Text>{selectedSession.os}</Text>
              </div>
            </div>

            <div>
              <Text type="secondary">Location</Text>
              <div style={{ marginTop: '8px' }}>
                <Space>
                  <EnvironmentOutlined />
                  <div>
                    {selectedSession.city && selectedSession.country && (
                      <Text>{`${selectedSession.city}, ${selectedSession.country}`}</Text>
                    )}
                    {!selectedSession.city && selectedSession.country && (
                      <Text>{selectedSession.country}</Text>
                    )}
                    {!selectedSession.country && <Text>Unknown location</Text>}
                    <br />
                    <Text type="secondary">{selectedSession.ipAddress}</Text>
                  </div>
                </Space>
              </div>
            </div>

            <div>
              <Text type="secondary">Session Started</Text>
              <div style={{ marginTop: '8px' }}>
                <Space>
                  <ClockCircleOutlined />
                  <div>
                    <Text>{dayjs(selectedSession.createdAt).format('MMMM D, YYYY [at] HH:mm')}</Text>
                    <br />
                    <Text type="secondary">{dayjs(selectedSession.createdAt).fromNow()}</Text>
                  </div>
                </Space>
              </div>
            </div>

            <div>
              <Text type="secondary">Last Activity</Text>
              <div style={{ marginTop: '8px' }}>
                <Space>
                  <ClockCircleOutlined />
                  <div>
                    <Text>{dayjs(selectedSession.lastActivityAt).format('MMMM D, YYYY [at] HH:mm')}</Text>
                    <br />
                    <Text type="secondary">{dayjs(selectedSession.lastActivityAt).fromNow()}</Text>
                  </div>
                </Space>
              </div>
            </div>

            <div>
              <Text type="secondary">Security Status</Text>
              <div style={{ marginTop: '8px' }}>
                <Space direction="vertical">
                  <Tag
                    color={selectedSession.mfaVerified ? 'green' : 'default'}
                    icon={selectedSession.mfaVerified ? <CheckCircleOutlined /> : undefined}
                  >
                    {selectedSession.mfaVerified ? 'MFA Verified' : 'No MFA'}
                  </Tag>
                  <Tag
                    color={selectedSession.isTrustedDevice ? 'blue' : 'default'}
                    icon={selectedSession.isTrustedDevice ? <SafetyOutlined /> : undefined}
                  >
                    {selectedSession.isTrustedDevice ? 'Trusted Device' : 'Untrusted Device'}
                  </Tag>
                  {selectedSession.isCurrent && (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Current Session
                    </Tag>
                  )}
                </Space>
              </div>
            </div>
          </Space>
        )}
      </Modal>

      {/* Help Section */}
      <Card title="About Sessions" style={{ marginTop: '24px' }}>
        <Space direction="vertical" size="small">
          <Text>• Sessions are created each time you sign in from a new device or browser</Text>
          <Text>• Sessions expire after 7 days of inactivity</Text>
          <Text>• You can have a maximum of 5 active sessions</Text>
          <Text>• Revoking a session will immediately sign out that device</Text>
          <Text>• Use "Revoke All Others" to sign out from all devices except this one</Text>
        </Space>
      </Card>
    </div>
  );
}
