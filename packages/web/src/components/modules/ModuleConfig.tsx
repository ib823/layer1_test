'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, InputNumber, Button, Card, Space, App, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { ConfigFormConfig } from './types';

const { TextArea } = Input;

interface ModuleConfigProps {
  config: ConfigFormConfig;
  moduleId: string;
}

export const ModuleConfig: React.FC<ModuleConfigProps> = ({ config, moduleId }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(config.endpoint);
      const data = await response.json();
      form.setFieldsValue(data);
    } catch (error) {
      message.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const response = await fetch(config.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Configuration saved successfully');
      } else {
        message.error('Failed to save configuration');
      }
    } catch (error) {
      message.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        autoComplete="off"
      >
        {config.sections.map(section => (
          <Card 
            key={section.key} 
            title={section.title} 
            style={{ marginBottom: '24px' }}
          >
            {section.fields.map(field => {
              switch (field.type) {
                case 'input':
                  return (
                    <Form.Item
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      rules={[{ required: field.required, message: `${field.label} is required` }]}
                    >
                      <Input placeholder={field.placeholder} />
                    </Form.Item>
                  );
                
                case 'textarea':
                  return (
                    <Form.Item
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      rules={[{ required: field.required, message: `${field.label} is required` }]}
                    >
                      <TextArea rows={4} placeholder={field.placeholder} />
                    </Form.Item>
                  );
                
                case 'select':
                  return (
                    <Form.Item
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      rules={[{ required: field.required, message: `${field.label} is required` }]}
                    >
                      <Select options={field.options} placeholder={field.placeholder} />
                    </Form.Item>
                  );
                
                case 'number':
                  return (
                    <Form.Item
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      rules={[{ required: field.required, message: `${field.label} is required` }]}
                    >
                      <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />
                    </Form.Item>
                  );
                
                case 'switch':
                  return (
                    <Form.Item
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  );
                
                default:
                  return null;
              }
            })}
          </Card>
        ))}

        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Save Changes
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default ModuleConfig;
