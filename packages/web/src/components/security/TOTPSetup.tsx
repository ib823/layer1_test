'use client';

import { useState, useEffect } from 'react';
import { Modal, Steps, Input, Button, Space, Typography, Image, Alert, message } from 'antd';
import { QrcodeOutlined, KeyOutlined, SafetyOutlined } from '@ant-design/icons';
import QRCode from 'qrcode';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface TOTPSetupProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TOTPSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export function TOTPSetup({ visible, onClose, onComplete }: TOTPSetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<TOTPSetupData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (visible) {
      initializeSetup();
    }
  }, [visible]);

  useEffect(() => {
    if (setupData?.qrCodeUrl) {
      generateQRCode(setupData.qrCodeUrl);
    }
  }, [setupData]);

  const initializeSetup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mfa/totp/setup', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
      } else {
        throw new Error('Failed to initialize TOTP setup');
      }
    } catch (error) {
      message.error('Failed to initialize TOTP setup');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (url: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      message.error('Please enter a 6-digit code');
      return;
    }

    try {
      setVerifying(true);
      const response = await fetch('/api/mfa/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCode,
          secret: setupData?.secret,
        }),
      });

      if (response.ok) {
        message.success('TOTP enabled successfully!');
        setCurrentStep(2); // Move to backup codes step
      } else {
        throw new Error('Invalid code');
      }
    } catch (error) {
      message.error('Invalid verification code. Please try again.');
      setVerificationCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    setCurrentStep(0);
    setVerificationCode('');
    setSetupData(null);
  };

  const handleCancel = () => {
    setCurrentStep(0);
    setVerificationCode('');
    setSetupData(null);
    onClose();
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      message.success('Secret copied to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    if (setupData?.backupCodes) {
      const content = `Prism - TOTP Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${setupData.backupCodes.join('\n')}\n\nKeep these codes in a safe place. Each code can only be used once.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'totp-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('Backup codes downloaded');
    }
  };

  return (
    <Modal
      title="Set Up Authenticator App"
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={null}
    >
      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        <Step title="Scan QR Code" icon={<QrcodeOutlined />} />
        <Step title="Verify" icon={<KeyOutlined />} />
        <Step title="Backup Codes" icon={<SafetyOutlined />} />
      </Steps>

      {currentStep === 0 && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Step 1: Scan QR Code</Title>
            <Paragraph>
              Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.) and scan this QR code:
            </Paragraph>
          </div>

          {qrCodeDataUrl ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Image
                src={qrCodeDataUrl}
                alt="TOTP QR Code"
                preview={false}
                style={{ border: '2px solid #d9d9d9', borderRadius: '8px' }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">Loading QR code...</Text>
            </div>
          )}

          <Alert
            message="Can't scan the QR code?"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>Enter this secret key manually in your authenticator app:</Text>
                <Input.TextArea
                  value={setupData?.secret}
                  readOnly
                  autoSize={{ minRows: 2, maxRows: 2 }}
                  style={{ fontFamily: 'monospace', fontSize: '14px' }}
                />
                <Button size="small" onClick={copySecret}>
                  Copy Secret
                </Button>
              </Space>
            }
            type="info"
            showIcon
          />

          <Button
            type="primary"
            block
            onClick={() => setCurrentStep(1)}
            disabled={!setupData}
          >
            Continue to Verification
          </Button>
        </Space>
      )}

      {currentStep === 1 && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Step 2: Verify Setup</Title>
            <Paragraph>
              Enter the 6-digit code from your authenticator app to verify the setup:
            </Paragraph>
          </div>

          <Input
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            style={{ fontSize: '24px', textAlign: 'center', letterSpacing: '8px' }}
            onPressEnter={handleVerify}
            autoFocus
          />

          <Space style={{ width: '100%' }}>
            <Button onClick={() => setCurrentStep(0)}>
              Back
            </Button>
            <Button
              type="primary"
              onClick={handleVerify}
              loading={verifying}
              disabled={verificationCode.length !== 6}
              style={{ flex: 1 }}
            >
              Verify and Enable
            </Button>
          </Space>
        </Space>
      )}

      {currentStep === 2 && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="TOTP Enabled Successfully!"
            description="Your authenticator app is now set up. Save your backup codes below."
            type="success"
            showIcon
          />

          <div>
            <Title level={4}>Backup Recovery Codes</Title>
            <Paragraph>
              Save these backup codes in a safe place. Each code can only be used once if you lose access to your authenticator app.
            </Paragraph>
          </div>

          <div
            style={{
              background: '#f5f5f5',
              padding: '16px',
              borderRadius: '8px',
              fontFamily: 'monospace',
            }}
          >
            {setupData?.backupCodes.map((code, index) => (
              <div key={index} style={{ padding: '4px 0' }}>
                {code}
              </div>
            ))}
          </div>

          <Space style={{ width: '100%' }}>
            <Button onClick={downloadBackupCodes}>
              Download Codes
            </Button>
            <Button type="primary" onClick={handleComplete} style={{ flex: 1 }}>
              Done
            </Button>
          </Space>

          <Alert
            message="Important"
            description="Make sure you've saved these codes before closing this window. You won't be able to see them again."
            type="warning"
            showIcon
          />
        </Space>
      )}
    </Modal>
  );
}
