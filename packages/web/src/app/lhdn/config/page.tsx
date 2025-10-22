'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { Tabs } from '@/components/ui/Tabs';
import { PageHead } from '@/components/seo/PageHead';

interface LHDNConfig {
  tenantId: string;
  companyCode: string;
  companyName: string;
  companyTin: string;

  // API Configuration
  clientId: string;
  clientSecret: string; // Masked in UI
  apiBaseUrl: string;
  environment: 'SANDBOX' | 'PRODUCTION';

  // Invoice Settings
  invoicePrefix: string;
  autoSubmit: boolean;
  validateBeforePost: boolean;
  generateQrCode: boolean;
  retentionDays: number;

  // Mapping Configuration
  documentTypeMapping: Record<string, string>;
  taxCodeMapping: Record<string, string>;
  stateCodeMapping: Record<string, string>;

  // Notification Settings
  notifyOnSubmission: boolean;
  notifyOnRejection: boolean;
  notifyOnAcceptance: boolean;
  notificationEmail: string[];

  // Circuit Breaker Settings
  circuitBreakerEnabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;

  // Status
  isActive: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastTestAt?: string;
  updatedAt: string;
  updatedBy: string;
}

export default function ConfigStudioPage() {
  const [selectedTab, setSelectedTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editedConfig, setEditedConfig] = useState<Partial<LHDNConfig>>({});

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch configuration
  const { data: config, isLoading } = useQuery<LHDNConfig>({
    queryKey: ['lhdn-config'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/config`);
      if (!res.ok) throw new Error('Failed to fetch configuration');
      return res.json();
    },
  });

  // Update configuration mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<LHDNConfig>) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update configuration');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lhdn-config'] });
      addToast({
        title: 'Configuration Updated',
        message: 'LHDN configuration has been saved successfully',
        type: 'success',
      });
      setIsEditing(false);
      setEditedConfig({});
    },
    onError: (error: Error) => {
      addToast({
        title: 'Update Failed',
        message: error.message,
        type: 'error',
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/config/test-connection`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Connection test failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lhdn-config'] });
      addToast({
        title: 'Connection Test Successful',
        message: `Successfully connected to LHDN ${data.environment} environment`,
        type: 'success',
      });
      setShowTestModal(false);
    },
    onError: (error: Error) => {
      addToast({
        title: 'Connection Test Failed',
        message: error.message,
        type: 'error',
      });
    },
  });

  const handleEdit = () => {
    setEditedConfig(config || {});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedConfig({});
    setIsEditing(false);
  };

  const handleSave = () => {
    updateMutation.mutate(editedConfig);
  };

  const updateField = (field: string, value: any) => {
    setEditedConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading || !config) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <p className="text-text-secondary">Loading configuration...</p>
        </div>
      </div>
    );
  }

  const currentConfig = isEditing ? editedConfig : config;

  return (
    <>
      <PageHead
        title="LHDN Configuration Studio"
        description="Configure LHDN e-Invoice integration settings, API credentials, and system parameters"
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Breadcrumbs
          items={[
            { label: 'LHDN e-Invoice', href: '/lhdn' },
            { label: 'Configuration Studio' },
          ]}
        />

      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            Configuration Studio
          </h1>
          <p className="text-text-secondary">
            Manage LHDN MyInvois API configuration and integration settings
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setShowTestModal(true)}>
                Test Connection
              </Button>
              <Button variant="primary" onClick={handleEdit}>
                Edit Configuration
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className="mb-6">
        <Card.Body>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-text-secondary">Environment</p>
                <p className="text-lg font-semibold text-text-primary">{currentConfig.environment}</p>
              </div>
              <div className="h-8 w-px bg-border-default" />
              <div>
                <p className="text-sm text-text-secondary">Connection Status</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      currentConfig.connectionStatus === 'CONNECTED'
                        ? 'low'
                        : currentConfig.connectionStatus === 'ERROR'
                        ? 'high'
                        : 'medium'
                    }
                  >
                    {currentConfig.connectionStatus}
                  </Badge>
                  {currentConfig.lastTestAt && (
                    <span className="text-xs text-text-secondary">
                      Last tested: {new Date(currentConfig.lastTestAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 w-px bg-border-default" />
              <div>
                <p className="text-sm text-text-secondary">Company</p>
                <p className="text-lg font-semibold text-text-primary">{currentConfig.companyName}</p>
                <p className="text-xs text-text-secondary">TIN: {currentConfig.companyTin}</p>
              </div>
            </div>
            <div>
              <Badge variant={currentConfig.isActive ? 'low' : 'high'}>
                {currentConfig.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <Tabs.List>
          <Tabs.Trigger value="general">General</Tabs.Trigger>
          <Tabs.Trigger value="api">API Credentials</Tabs.Trigger>
          <Tabs.Trigger value="invoice">Invoice Settings</Tabs.Trigger>
          <Tabs.Trigger value="mapping">SAP Mapping</Tabs.Trigger>
          <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
          <Tabs.Trigger value="resilience">Resilience</Tabs.Trigger>
        </Tabs.List>

        {/* General Tab */}
        <Tabs.Content value="general">
          <Card>
            <Card.Body>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Company Code
                    </label>
                    <Input
                      value={currentConfig.companyCode || ''}
                      onChange={(e) => updateField('companyCode', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Company Name
                    </label>
                    <Input
                      value={currentConfig.companyName || ''}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Company TIN
                    </label>
                    <Input
                      value={currentConfig.companyTin || ''}
                      onChange={(e) => updateField('companyTin', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Environment
                    </label>
                    <Select
                      value={currentConfig.environment || 'SANDBOX'}
                      onChange={(e) => updateField('environment', e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="SANDBOX">Sandbox</option>
                      <option value="PRODUCTION">Production</option>
                    </Select>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* API Credentials Tab */}
        <Tabs.Content value="api">
          <Card>
            <Card.Body>
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Credentials are encrypted at rest. Client secret is masked for security.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      API Base URL
                    </label>
                    <Input
                      value={currentConfig.apiBaseUrl || ''}
                      onChange={(e) => updateField('apiBaseUrl', e.target.value)}
                      disabled={!isEditing}
                      placeholder="https://api.myinvois.hasil.gov.my"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Client ID
                    </label>
                    <Input
                      value={currentConfig.clientId || ''}
                      onChange={(e) => updateField('clientId', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Client Secret
                    </label>
                    <Input
                      type="password"
                      value={isEditing ? currentConfig.clientSecret || '' : '••••••••••••••••'}
                      onChange={(e) => updateField('clientSecret', e.target.value)}
                      disabled={!isEditing}
                      placeholder={isEditing ? 'Enter new client secret' : ''}
                    />
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* Invoice Settings Tab */}
        <Tabs.Content value="invoice">
          <Card>
            <Card.Body>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Invoice Number Prefix
                    </label>
                    <Input
                      value={currentConfig.invoicePrefix || ''}
                      onChange={(e) => updateField('invoicePrefix', e.target.value)}
                      disabled={!isEditing}
                      placeholder="INV-"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Retention Period (days)
                    </label>
                    <Input
                      type="number"
                      value={currentConfig.retentionDays || 2555}
                      onChange={(e) => updateField('retentionDays', parseInt(e.target.value))}
                      disabled={!isEditing}
                    />
                    <p className="text-xs text-text-secondary mt-1">LHDN requires 7-year retention (2555 days)</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.autoSubmit || false}
                      onChange={(e) => updateField('autoSubmit', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded border-border-default"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      Auto-submit invoices after validation
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.validateBeforePost || false}
                      onChange={(e) => updateField('validateBeforePost', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded border-border-default"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      Validate before SAP posting
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.generateQrCode || false}
                      onChange={(e) => updateField('generateQrCode', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded border-border-default"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      Generate QR codes for accepted invoices
                    </span>
                  </label>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* SAP Mapping Tab */}
        <Tabs.Content value="mapping">
          <Card>
            <Card.Body>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Document Type Mapping</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Map SAP document types to LHDN document types
                  </p>
                  <div className="space-y-2">
                    {Object.entries(currentConfig.documentTypeMapping || {}).map(([sapType, lhdnType]) => (
                      <div key={sapType} className="grid grid-cols-3 gap-4">
                        <Input value={sapType} disabled placeholder="SAP Type" />
                        <span className="flex items-center justify-center text-text-secondary">→</span>
                        <Input value={lhdnType} disabled placeholder="LHDN Type" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Tax Code Mapping</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Map SAP tax codes to LHDN tax types
                  </p>
                  <div className="space-y-2">
                    {Object.entries(currentConfig.taxCodeMapping || {}).slice(0, 5).map(([sapCode, lhdnCode]) => (
                      <div key={sapCode} className="grid grid-cols-3 gap-4">
                        <Input value={sapCode} disabled placeholder="SAP Code" />
                        <span className="flex items-center justify-center text-text-secondary">→</span>
                        <Input value={lhdnCode} disabled placeholder="LHDN Code" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* Notifications Tab */}
        <Tabs.Content value="notifications">
          <Card>
            <Card.Body>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-text-primary mb-2 block">
                    Notification Emails
                  </label>
                  <Input
                    value={currentConfig.notificationEmail?.join(', ') || ''}
                    onChange={(e) => updateField('notificationEmail', e.target.value.split(',').map(s => s.trim()))}
                    disabled={!isEditing}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <p className="text-xs text-text-secondary mt-1">Comma-separated email addresses</p>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium text-text-primary">Notification Triggers</p>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.notifyOnSubmission || false}
                      onChange={(e) => updateField('notifyOnSubmission', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded border-border-default"
                    />
                    <span className="text-sm text-text-primary">
                      Notify on successful submission
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.notifyOnAcceptance || false}
                      onChange={(e) => updateField('notifyOnAcceptance', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded border-border-default"
                    />
                    <span className="text-sm text-text-primary">
                      Notify on LHDN acceptance
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.notifyOnRejection || false}
                      onChange={(e) => updateField('notifyOnRejection', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded border-border-default"
                    />
                    <span className="text-sm text-text-primary">
                      Notify on LHDN rejection
                    </span>
                  </label>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* Resilience Tab */}
        <Tabs.Content value="resilience">
          <Card>
            <Card.Body>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Circuit Breaker Settings</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Configure circuit breaker to prevent cascading failures
                  </p>

                  <label className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={currentConfig.circuitBreakerEnabled || false}
                      onChange={(e) => updateField('circuitBreakerEnabled', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded border-border-default"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      Enable circuit breaker
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Failure Threshold
                    </label>
                    <Input
                      type="number"
                      value={currentConfig.failureThreshold || 5}
                      onChange={(e) => updateField('failureThreshold', parseInt(e.target.value))}
                      disabled={!isEditing || !currentConfig.circuitBreakerEnabled}
                    />
                    <p className="text-xs text-text-secondary mt-1">Open circuit after N failures</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Success Threshold
                    </label>
                    <Input
                      type="number"
                      value={currentConfig.successThreshold || 2}
                      onChange={(e) => updateField('successThreshold', parseInt(e.target.value))}
                      disabled={!isEditing || !currentConfig.circuitBreakerEnabled}
                    />
                    <p className="text-xs text-text-secondary mt-1">Close circuit after N successes</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">
                      Timeout (ms)
                    </label>
                    <Input
                      type="number"
                      value={currentConfig.timeoutMs || 30000}
                      onChange={(e) => updateField('timeoutMs', parseInt(e.target.value))}
                      disabled={!isEditing || !currentConfig.circuitBreakerEnabled}
                    />
                    <p className="text-xs text-text-secondary mt-1">Wait time before half-open</p>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Content>
      </Tabs>

      {/* Test Connection Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Test LHDN Connection"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Test connection to LHDN MyInvois API to verify credentials and configuration.
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowTestModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending}
            >
              {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </>
  );
}
