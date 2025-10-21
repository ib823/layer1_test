'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Form, Input, App } from 'antd';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { ModuleDataGrid } from '@/components/modules/ModuleDataGrid';
import { ModuleDetailView } from '@/components/modules/ModuleDetailView';
import { sodConfig } from '../config';

export default function SoDViolationsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remediateModalOpen, setRemediateModalOpen] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Override action handlers in config
  const configWithHandlers = {
    ...sodConfig.dataGrid,
    actions: sodConfig.dataGrid.actions.map(action => {
      if (action.key === 'view') {
        return {
          ...action,
          onClick: (record: any) => {
            setSelectedId(record.id);
            setDetailOpen(true);
          },
        };
      }
      if (action.key === 'remediate') {
        return {
          ...action,
          onClick: (record: any) => {
            setSelectedId(record.id);
            setRemediateModalOpen(true);
          },
        };
      }
      if (action.key === 'exception') {
        return {
          ...action,
          onClick: (record: any) => {
            setSelectedId(record.id);
            setExceptionModalOpen(true);
          },
        };
      }
      return action;
    }),
  };

  const detailConfigWithHandlers = {
    ...sodConfig.detailView,
    primaryAction: {
      ...sodConfig.detailView.primaryAction,
      onClick: (id: string) => {
        setRemediateModalOpen(true);
      },
    },
  };

  const handleRemediate = async (values: any) => {
    try {
      const response = await fetch(`/api/modules/sod/violations/${selectedId}/remediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Remediation action submitted');
        setRemediateModalOpen(false);
        form.resetFields();
      } else {
        message.error('Failed to submit remediation');
      }
    } catch (error) {
      message.error('Failed to submit remediation');
    }
  };

  const handleException = async (values: any) => {
    try {
      const response = await fetch(`/api/modules/sod/violations/${selectedId}/exception`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Exception request submitted');
        setExceptionModalOpen(false);
        form.resetFields();
      } else {
        message.error('Failed to submit exception request');
      }
    } catch (error) {
      message.error('Failed to submit exception request');
    }
  };

  return (
    <ModuleTemplate config={sodConfig}>
      <ModuleDataGrid config={configWithHandlers} />
      
      <ModuleDetailView
        config={detailConfigWithHandlers}
        recordId={selectedId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* Remediate Modal */}
      <Modal
        title="Remediate Violation"
        open={remediateModalOpen}
        onCancel={() => setRemediateModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleRemediate}>
          <Form.Item
            name="action"
            label="Remediation Action"
            rules={[{ required: true, message: 'Please select an action' }]}
          >
            <Input.TextArea rows={4} placeholder="Describe the remediation action..." />
          </Form.Item>
          <Form.Item
            name="role_id"
            label="Role to Remove"
            rules={[{ required: true, message: 'Please specify the role' }]}
          >
            <Input placeholder="Role ID or name" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Exception Modal */}
      <Modal
        title="Request Exception"
        open={exceptionModalOpen}
        onCancel={() => setExceptionModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleException}>
          <Form.Item
            name="justification"
            label="Justification"
            rules={[{ required: true, message: 'Please provide justification' }]}
          >
            <Input.TextArea rows={4} placeholder="Explain why this exception is needed..." />
          </Form.Item>
        </Form>
      </Modal>
    </ModuleTemplate>
  );
}
