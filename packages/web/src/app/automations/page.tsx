'use client';

/**
 * Automations Page
 *
 * Workflow automation builder and management
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Drawer,
  Descriptions,
  Typography,
  Row,
  Col,
  Statistic,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AccessibleModal } from '@/components/modals/AccessibleModal';
import { AccessibleFormField } from '@/components/forms/AccessibleFormField';
import { ErrorAnnouncer } from '@/components/forms/ErrorAnnouncer';
import { PageHead } from '@/components/seo/PageHead';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// Mock data for development
const generateMockAutomations = () => {
  return [
    {
      id: 'auto-1',
      name: 'Critical SoD Violation Alert',
      description: 'Send email when critical SoD violation is detected',
      trigger: {
        type: 'event',
        config: { eventType: 'SOD_VIOLATION_DETECTED' },
      },
      actions: [
        { type: 'email', config: { to: ['compliance@company.com'], subject: 'Critical SoD Violation' } },
      ],
      enabled: true,
      status: 'active',
      runCount: 45,
      errorCount: 2,
      lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'auto-2',
      name: 'Weekly Compliance Report',
      description: 'Generate and email compliance report every Monday',
      trigger: {
        type: 'schedule',
        config: { schedule: '0 9 * * 1' },
      },
      actions: [
        { type: 'generate_report', config: { reportType: 'compliance_summary', format: 'pdf' } },
        { type: 'email', config: { to: ['management@company.com'], subject: 'Weekly Compliance Report' } },
      ],
      enabled: true,
      status: 'active',
      runCount: 12,
      errorCount: 0,
      lastRun: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'auto-3',
      name: 'High Value Transaction Alert',
      description: 'Notify when transaction exceeds $100k',
      trigger: {
        type: 'condition',
        config: { field: 'amount', operator: 'gt', value: 100000 },
      },
      actions: [
        { type: 'slack', config: { channel: '#finance-alerts', message: 'High value transaction detected' } },
      ],
      enabled: false,
      status: 'paused',
      runCount: 8,
      errorCount: 1,
      lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const [form] = Form.useForm();
  const [triggerTypes, setTriggerTypes] = useState<any[]>([]);
  const [actionTypes, setActionTypes] = useState<any[]>([]);

  // Accessible error handling
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadAutomations();
    loadMetadata();
  }, []);

  const loadAutomations = async () => {
    setLoading(true);
    try {
      // TODO: Fetch from API
      setTimeout(() => {
        setAutomations(generateMockAutomations());
        setLoading(false);
      }, 500);
    } catch (error) {
      message.error('Failed to load automations');
      setErrorMessage('Failed to load automations. Please refresh the page.');
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    // TODO: Fetch from API
    setTriggerTypes([
      { value: 'event', label: 'Event-Based', description: 'Trigger on system events' },
      { value: 'schedule', label: 'Schedule-Based', description: 'Trigger on a schedule' },
      { value: 'condition', label: 'Condition-Based', description: 'Trigger when condition is met' },
      { value: 'webhook', label: 'Webhook', description: 'Trigger via external webhook' },
    ]);

    setActionTypes([
      { value: 'email', label: 'Send Email', fields: ['to', 'subject', 'template'] },
      { value: 'slack', label: 'Send Slack Message', fields: ['channel', 'message'] },
      { value: 'webhook', label: 'Call Webhook', fields: ['url', 'method'] },
      { value: 'generate_report', label: 'Generate Report', fields: ['reportType', 'reportFormat'] },
      { value: 'update_record', label: 'Update Record', fields: ['recordType', 'recordId', 'updates'] },
      { value: 'create_task', label: 'Create Task', fields: ['taskType', 'taskConfig'] },
    ]);
  };

  const handleCreate = () => {
    form.resetFields();
    setSelectedAutomation(null);
    setModalVisible(true);
  };

  const handleEdit = (automation: any) => {
    setSelectedAutomation(automation);
    form.setFieldsValue({
      name: automation.name,
      description: automation.description,
      triggerType: automation.trigger.type,
      enabled: automation.enabled,
    });
    setModalVisible(true);
  };

  const handleView = (automation: any) => {
    setSelectedAutomation(automation);
    setDrawerVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      setErrors({});
      setErrorMessage('');

      message.loading({ content: 'Saving automation...', key: 'save' });

      // TODO: Call API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success({ content: 'Automation saved successfully!', key: 'save' });
      setSuccessMessage('Automation saved successfully!');
      setModalVisible(false);
      form.resetFields();
      loadAutomations();
    } catch (error) {
      message.error({ content: 'Failed to save automation', key: 'save' });
      setErrorMessage('Failed to save automation. Please check your input and try again.');
    }
  };

  const handleToggle = async (automation: any) => {
    try {
      setErrorMessage('');

      message.loading({ content: 'Updating automation...', key: 'toggle' });

      // TODO: Call API
      await new Promise((resolve) => setTimeout(resolve, 500));

      const statusText = automation.enabled ? 'disabled' : 'enabled';
      message.success({
        content: `Automation ${statusText}`,
        key: 'toggle',
      });
      setSuccessMessage(`Automation ${statusText} successfully`);
      loadAutomations();
    } catch (error) {
      message.error({ content: 'Failed to update automation', key: 'toggle' });
      setErrorMessage('Failed to update automation status. Please try again.');
    }
  };

  const handleExecute = async (automation: any) => {
    try {
      setErrorMessage('');

      message.loading({ content: 'Executing automation...', key: 'execute' });

      // TODO: Call API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      message.success({ content: 'Automation executed successfully!', key: 'execute' });
      setSuccessMessage('Automation executed successfully!');
      loadAutomations();
    } catch (error) {
      message.error({ content: 'Failed to execute automation', key: 'execute' });
      setErrorMessage('Failed to execute automation. Please try again.');
    }
  };

  const handleDelete = (automation: any) => {
    Modal.confirm({
      title: 'Delete Automation',
      content: `Are you sure you want to delete "${automation.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          setErrorMessage('');

          message.loading({ content: 'Deleting automation...', key: 'delete' });

          // TODO: Call API
          await new Promise((resolve) => setTimeout(resolve, 500));

          message.success({ content: 'Automation deleted', key: 'delete' });
          setSuccessMessage(`Automation "${automation.name}" deleted successfully`);
          loadAutomations();
        } catch (error) {
          message.error({ content: 'Failed to delete automation', key: 'delete' });
          setErrorMessage('Failed to delete automation. Please try again.');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name: string, record: any) => (
        <div>
          <strong>{name}</strong>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.description}</div>
        </div>
      ),
    },
    {
      title: 'Trigger',
      dataIndex: 'trigger',
      key: 'trigger',
      width: 150,
      render: (trigger: any) => (
        <Tag icon={trigger.type === 'schedule' ? <ClockCircleOutlined /> : <ThunderboltOutlined />}>
          {trigger.type}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actionsCount',
      width: 100,
      render: (record: any) => <Tag>{record.actions.length} actions</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'status',
      width: 100,
      render: (enabled: boolean) =>
        enabled ? (
          <Tag color="success" icon={<PlayCircleOutlined />}>
            Active
          </Tag>
        ) : (
          <Tag color="default" icon={<PauseCircleOutlined />}>
            Paused
          </Tag>
        ),
    },
    {
      title: 'Executions',
      key: 'executions',
      width: 120,
      render: (record: any) => (
        <div>
          <div style={{ color: '#52c41a' }}>✓ {record.runCount - record.errorCount}</div>
          {record.errorCount > 0 && <div style={{ color: '#ff4d4f' }}>✗ {record.errorCount}</div>}
        </div>
      ),
    },
    {
      title: 'Last Run',
      dataIndex: 'lastRun',
      key: 'lastRun',
      width: 150,
      render: (lastRun: string) => (lastRun ? dayjs(lastRun).fromNow() : 'Never'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecute(record)}
            size="small"
          >
            Run
          </Button>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            size="small"
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={record.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggle(record)}
            size="small"
          >
            {record.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const stats = {
    total: automations.length,
    active: automations.filter((a) => a.enabled).length,
    totalRuns: automations.reduce((sum, a) => sum + a.runCount, 0),
    errors: automations.reduce((sum, a) => sum + a.errorCount, 0),
  };

  return (
    <>
      <PageHead
        title="Automations"
        description="Create and manage workflow automations for events, schedules, and conditions"
      />
      <div style={{ padding: '24px' }}>
        <ErrorAnnouncer
          errorMessage={errorMessage}
          successMessage={successMessage}
          onClearError={() => setErrorMessage('')}
          onClearSuccess={() => setSuccessMessage('')}
        />

      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <RocketOutlined /> Automations
          </Title>
          <Paragraph>
            Create and manage workflow automations for events, schedules, and conditions
          </Paragraph>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
            Create Automation
          </Button>
        </Col>
      </Row>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Automations" value={stats.total} prefix={<RocketOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Executions" value={stats.totalRuns} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Errors"
              value={stats.errors}
              valueStyle={{ color: stats.errors > 0 ? '#ff4d4f' : undefined }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Automations Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={automations}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} automations`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <AccessibleModal
        modalTitle={selectedAutomation ? 'Edit Automation' : 'Create Automation'}
        modalDescription={
          selectedAutomation
            ? `Edit the configuration for the ${selectedAutomation.name} automation`
            : 'Create a new workflow automation by providing a name, description, trigger type, and initial status'
        }
        title={selectedAutomation ? 'Edit Automation' : 'Create Automation'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
        okText="Save"
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <AccessibleFormField
            name="name"
            label="Automation Name"
            required
            helpText="Choose a descriptive name that clearly identifies this automation's purpose"
            errorMessage={errors.name}
            formItemProps={{ rules: [{ required: true, message: 'Name is required' }] }}
          >
            <Input placeholder="e.g., Critical SoD Violation Alert" />
          </AccessibleFormField>

          <AccessibleFormField
            name="description"
            label="Description"
            helpText="Explain what this automation does and when it will run"
            errorMessage={errors.description}
          >
            <TextArea rows={2} placeholder="Describe what this automation does" />
          </AccessibleFormField>

          <Divider>Trigger</Divider>

          <AccessibleFormField
            name="triggerType"
            label="Trigger Type"
            required
            helpText="Select when this automation should be triggered: on events, schedules, conditions, or webhooks"
            errorMessage={errors.triggerType}
            formItemProps={{ rules: [{ required: true, message: 'Trigger type is required' }] }}
          >
            <Select placeholder="Select trigger type" options={triggerTypes} />
          </AccessibleFormField>

          <Divider>Actions</Divider>

          <Form.Item label="Actions">
            <Text type="secondary">Configure actions in the advanced editor (coming soon)</Text>
          </Form.Item>

          <AccessibleFormField
            name="enabled"
            label="Status"
            helpText="Enable to activate this automation immediately, or disable to keep it paused"
            errorMessage={errors.enabled}
            formItemProps={{ valuePropName: 'checked', initialValue: true }}
          >
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </AccessibleFormField>
        </Form>
      </AccessibleModal>

      {/* View Drawer */}
      <Drawer
        title="Automation Details"
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedAutomation && (
          <>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Name">{selectedAutomation.name}</Descriptions.Item>
              <Descriptions.Item label="Description">{selectedAutomation.description}</Descriptions.Item>
              <Descriptions.Item label="Trigger Type">
                <Tag>{selectedAutomation.trigger.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Actions">
                {selectedAutomation.actions.map((action: any, index: number) => (
                  <Tag key={index} style={{ marginBottom: 4 }}>
                    {action.type}
                  </Tag>
                ))}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {selectedAutomation.enabled ? (
                  <Tag color="success">Active</Tag>
                ) : (
                  <Tag color="default">Paused</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Run Count">{selectedAutomation.runCount}</Descriptions.Item>
              <Descriptions.Item label="Error Count">
                {selectedAutomation.errorCount > 0 ? (
                  <Text type="danger">{selectedAutomation.errorCount}</Text>
                ) : (
                  selectedAutomation.errorCount
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Last Run">
                {selectedAutomation.lastRun
                  ? dayjs(selectedAutomation.lastRun).format('YYYY-MM-DD HH:mm:ss')
                  : 'Never'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button icon={<PlayCircleOutlined />} onClick={() => handleExecute(selectedAutomation)}>
                Execute Now
              </Button>
              <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedAutomation)}>
                Edit
              </Button>
            </Space>
          </>
        )}
      </Drawer>
    </div>
    </>
  );
}
