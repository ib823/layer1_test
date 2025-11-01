'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, App } from 'antd';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { ModuleDataGridEnhanced } from '@/components/modules/ModuleDataGridEnhanced';
import { ModuleDetailView } from '@/components/modules/ModuleDetailView';
import { AccessibleModal } from '@/components/modals/AccessibleModal';
import { AccessibleFormField } from '@/components/forms/AccessibleFormField';
import { ErrorAnnouncer } from '@/components/forms/ErrorAnnouncer';
import { PageHead } from '@/components/seo/PageHead';
import { TermTooltip } from '@/components/terminology/TermTooltip';
import { sodConfig } from '../config';

export default function SoDViolationsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remediateModalOpen, setRemediateModalOpen] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Accessible error handling
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

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
      setErrors({});
      setErrorMessage('');

      const response = await fetch(`/api/modules/sod/violations/${selectedId}/remediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Remediation action submitted');
        setSuccessMessage('Remediation action submitted successfully');
        setRemediateModalOpen(false);
        form.resetFields();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to submit remediation' }));
        message.error('Failed to submit remediation');
        setErrorMessage(errorData.message || 'Failed to submit remediation. Please try again.');
      }
    } catch (error) {
      message.error('Failed to submit remediation');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  };

  const handleException = async (values: any) => {
    try {
      setErrors({});
      setErrorMessage('');

      const response = await fetch(`/api/modules/sod/violations/${selectedId}/exception`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Exception request submitted');
        setSuccessMessage('Exception request submitted successfully');
        setExceptionModalOpen(false);
        form.resetFields();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to submit exception request' }));
        message.error('Failed to submit exception request');
        setErrorMessage(errorData.message || 'Failed to submit exception request. Please try again.');
      }
    } catch (error) {
      message.error('Failed to submit exception request');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <>
      <PageHead
        title="SoD Violations"
        description="View and manage Segregation of Duties violations"
      />
      <ModuleTemplate config={sodConfig}>
        <ErrorAnnouncer
          errorMessage={errorMessage}
          successMessage={successMessage}
          onClearError={() => setErrorMessage('')}
          onClearSuccess={() => setSuccessMessage('')}
        />

      <ModuleDataGridEnhanced config={configWithHandlers} />

      <ModuleDetailView
        config={detailConfigWithHandlers}
        recordId={selectedId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* Remediate Modal */}
      <AccessibleModal
        modalTitle="Remediate Violation"
        modalDescription="Complete this form to specify the remediation action for the selected SoD violation"
        open={remediateModalOpen}
        onCancel={() => setRemediateModalOpen(false)}
        onOk={() => form.submit()}
        title="Remediate Violation"
      >
        <Form form={form} layout="vertical" onFinish={handleRemediate}>
          <AccessibleFormField
            name="action"
            label="Remediation Action"
            required
            helpText="Describe the specific action you will take to remediate this violation. Example: Remove Finance Viewer role from user."
            errorMessage={errors.action}
          >
            <Input.TextArea rows={4} placeholder="Example: Remove Finance Viewer role from user" />
          </AccessibleFormField>

          <AccessibleFormField
            name="role_id"
            label="Role to Remove"
            required
            helpText="Enter the role ID or name that should be removed from the user"
            errorMessage={errors.role_id}
          >
            <Input placeholder="Role ID or name" />
          </AccessibleFormField>
        </Form>
      </AccessibleModal>

      {/* Exception Modal */}
      <AccessibleModal
        modalTitle="Request Exception"
        modalDescription="Complete this form to request an exception for the selected SoD violation"
        open={exceptionModalOpen}
        onCancel={() => setExceptionModalOpen(false)}
        onOk={() => form.submit()}
        title="Request Exception"
      >
        <Form form={form} layout="vertical" onFinish={handleException}>
          <AccessibleFormField
            name="justification"
            label="Justification"
            required
            helpText="Explain why this exception is necessary and what compensating controls are in place"
            errorMessage={errors.justification}
          >
            <Input.TextArea rows={4} placeholder="Example: User requires both roles for month-end close process. Manager reviews all transactions." />
          </AccessibleFormField>
        </Form>
      </AccessibleModal>
    </ModuleTemplate>
    </>
  );
}
