'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, Alert, Spin, message } from 'antd';
import { DownloadOutlined, CopyOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface BackupCodesProps {
  visible: boolean;
  onClose: () => void;
}

export function BackupCodes({ visible, onClose }: BackupCodesProps) {
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [usedCodes, setUsedCodes] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      fetchBackupCodes();
    }
  }, [visible]);

  const fetchBackupCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mfa/backup-codes');

      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes);
        setUsedCodes(data.usedCount || 0);
      } else {
        throw new Error('Failed to fetch backup codes');
      }
    } catch (error) {
      message.error('Failed to load backup codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const content = codes.join('\n');
    navigator.clipboard.writeText(content);
    message.success('Backup codes copied to clipboard');
  };

  const handleDownload = () => {
    const content = `Prism - MFA Backup Recovery Codes\nGenerated: ${new Date().toISOString()}\n\nIMPORTANT: Keep these codes in a safe place!\nEach code can only be used once.\n\n${codes.join('\n')}\n\n${usedCodes > 0 ? `Used codes: ${usedCodes}\n` : ''}Remaining codes: ${codes.length - usedCodes}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('Backup codes downloaded');
  };

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate backup codes? This will invalidate all existing codes.')) {
      return;
    }

    try {
      setRegenerating(true);
      const response = await fetch('/api/mfa/backup-codes/regenerate', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes);
        setUsedCodes(0);
        message.success('Backup codes regenerated successfully');
      } else {
        throw new Error('Failed to regenerate backup codes');
      }
    } catch (error) {
      message.error('Failed to regenerate backup codes');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Modal
      title="Backup Recovery Codes"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={
        <Space>
          <Button onClick={onClose}>Close</Button>
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="What are backup codes?"
          description="These codes can be used to access your account if you lose access to your authenticator app or passkey. Each code can only be used once."
          type="info"
          showIcon
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {usedCodes > 0 && (
              <Alert
                message={`${usedCodes} code${usedCodes > 1 ? 's' : ''} used`}
                description={`You have ${codes.length - usedCodes} backup codes remaining.`}
                type="warning"
                showIcon
              />
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Title level={4} style={{ margin: 0 }}>Your Backup Codes</Title>
                <Text type="secondary">{codes.length} total codes</Text>
              </div>

              <div
                style={{
                  background: '#f5f5f5',
                  padding: '20px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                {codes.map((code, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '4px 0',
                      opacity: index < usedCodes ? 0.4 : 1,
                      textDecoration: index < usedCodes ? 'line-through' : 'none',
                    }}
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <Space style={{ width: '100%' }}>
              <Button icon={<CopyOutlined />} onClick={handleCopy}>
                Copy All
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                Download
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRegenerate}
                loading={regenerating}
                danger
              >
                Regenerate
              </Button>
            </Space>

            <Alert
              message="Keep these codes safe!"
              description={
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Print them and store in a secure location</li>
                  <li>Don't share them with anyone</li>
                  <li>Each code can only be used once</li>
                  <li>Regenerate if you suspect they've been compromised</li>
                </ul>
              }
              type="warning"
              showIcon
            />
          </>
        )}
      </Space>
    </Modal>
  );
}
