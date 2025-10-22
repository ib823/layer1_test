'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, InputNumber, Button, Card, Space, App, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { ConfigFormConfig } from './types';
import { AccessibleFormField } from '@/components/forms/AccessibleFormField';
import { ErrorAnnouncer } from '@/components/forms/ErrorAnnouncer';

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

  // Accessible error handling
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(config.endpoint);
      const data = await response.json();
      form.setFieldsValue(data);
    } catch (error) {
      message.error('Failed to load configuration');
      setErrorMessage('Failed to load configuration. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    setErrors({});
    setErrorMessage('');
    try {
      const response = await fetch(config.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Configuration saved successfully');
        setSuccessMessage('Configuration saved successfully');
      } else {
        message.error('Failed to save configuration');
        setErrorMessage('Failed to save configuration. Please check your input and try again.');
      }
    } catch (error) {
      message.error('Failed to save configuration');
      setErrorMessage('Network error. Please check your connection and try again.');
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
      <ErrorAnnouncer
        errorMessage={errorMessage}
        successMessage={successMessage}
        onClearError={() => setErrorMessage('')}
        onClearSuccess={() => setSuccessMessage('')}
      />

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
                    <AccessibleFormField
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      required={field.required}
                      helpText={field.placeholder}
                      errorMessage={errors[field.key]}
                      formItemProps={{
                        rules: [{ required: field.required, message: `${field.label} is required` }],
                      }}
                    >
                      <Input placeholder={field.placeholder} />
                    </AccessibleFormField>
                  );

                case 'textarea':
                  return (
                    <AccessibleFormField
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      required={field.required}
                      helpText={field.placeholder}
                      errorMessage={errors[field.key]}
                      formItemProps={{
                        rules: [{ required: field.required, message: `${field.label} is required` }],
                      }}
                    >
                      <TextArea rows={4} placeholder={field.placeholder} />
                    </AccessibleFormField>
                  );

                case 'select':
                  return (
                    <AccessibleFormField
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      required={field.required}
                      helpText={field.placeholder}
                      errorMessage={errors[field.key]}
                      formItemProps={{
                        rules: [{ required: field.required, message: `${field.label} is required` }],
                      }}
                    >
                      <Select options={field.options} placeholder={field.placeholder} />
                    </AccessibleFormField>
                  );

                case 'number':
                  return (
                    <AccessibleFormField
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      required={field.required}
                      helpText={field.placeholder}
                      errorMessage={errors[field.key]}
                      formItemProps={{
                        rules: [{ required: field.required, message: `${field.label} is required` }],
                      }}
                    >
                      <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />
                    </AccessibleFormField>
                  );

                case 'switch':
                  return (
                    <AccessibleFormField
                      key={field.key}
                      name={field.key}
                      label={field.label}
                      required={false}
                      helpText="Toggle to enable or disable this option"
                      errorMessage={errors[field.key]}
                      formItemProps={{
                        valuePropName: 'checked',
                      }}
                    >
                      <Switch />
                    </AccessibleFormField>
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
