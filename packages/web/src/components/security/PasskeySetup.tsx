'use client';

import { useState } from 'react';
import { Modal, Input, Button, Space, Typography, Alert, Steps, message } from 'antd';
import { KeyOutlined, SafetyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { startRegistration } from '@simplewebauthn/browser';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface PasskeySetupProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function PasskeySetup({ visible, onClose, onComplete }: PasskeySetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      message.error('Please enter a device name');
      return;
    }

    try {
      setRegistering(true);

      // Step 1: Get registration options from server
      const optionsResponse = await fetch('/api/mfa/passkey/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName }),
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsResponse.json();

      // Step 2: Use browser WebAuthn API to create credential
      let credential;
      try {
        credential = await startRegistration(options);
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Registration was cancelled or timed out');
        }
        throw error;
      }

      // Step 3: Send credential to server for verification
      const verifyResponse = await fetch('/api/mfa/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          deviceName,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify passkey registration');
      }

      setCurrentStep(1);

    } catch (error: any) {
      console.error('Passkey registration error:', error);
      message.error(error.message || 'Failed to register passkey. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    setCurrentStep(0);
    setDeviceName('');
  };

  const handleCancel = () => {
    setCurrentStep(0);
    setDeviceName('');
    onClose();
  };

  const getSuggestedDeviceName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Mac')) return 'MacBook';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    return 'My Device';
  };

  return (
    <Modal
      title="Register Passkey"
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={null}
    >
      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        <Step title="Device Name" icon={<KeyOutlined />} />
        <Step title="Complete" icon={<CheckCircleOutlined />} />
      </Steps>

      {currentStep === 0 && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="What are Passkeys?"
            description="Passkeys use your device's biometric authentication (Face ID, Touch ID, Windows Hello) or a security key. They're more secure than passwords and can't be phished."
            type="info"
            showIcon
          />

          <div>
            <Title level={4}>Name Your Device</Title>
            <Paragraph>
              Give this passkey a name so you can identify it later (e.g., "MacBook Pro", "iPhone", "YubiKey").
            </Paragraph>
          </div>

          <Input
            placeholder={getSuggestedDeviceName()}
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            maxLength={50}
            size="large"
            prefix={<KeyOutlined />}
            onPressEnter={handleRegister}
            autoFocus
          />

          <Alert
            message="Browser Compatibility"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>Passkeys work with:</Text>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Chrome 67+ / Edge 18+</li>
                  <li>Safari 13+ (iOS 14+, macOS 11+)</li>
                  <li>Firefox 60+</li>
                </ul>
              </Space>
            }
            type="warning"
            showIcon
          />

          <Space style={{ width: '100%' }}>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleRegister}
              loading={registering}
              disabled={!deviceName.trim()}
              style={{ flex: 1 }}
              icon={<SafetyOutlined />}
            >
              {registering ? 'Follow Device Prompt...' : 'Register Passkey'}
            </Button>
          </Space>

          <Alert
            message="What happens next?"
            description="Your browser will prompt you to use Face ID, Touch ID, Windows Hello, or insert a security key to create your passkey."
            type="info"
          />
        </Space>
      )}

      {currentStep === 1 && (
        <Space direction="vertical" size="large" style={{ width: '100%' }} style={{ textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a' }} />

          <Title level={3}>Passkey Registered!</Title>

          <Alert
            message="Success"
            description={`Your passkey "${deviceName}" has been successfully registered. You can now use it to sign in to your account.`}
            type="success"
            showIcon
          />

          <div>
            <Paragraph>
              Next time you sign in, you'll be able to use:
            </Paragraph>
            <ul style={{ textAlign: 'left', margin: '0 auto', maxWidth: '400px' }}>
              <li>Face ID / Touch ID (Apple devices)</li>
              <li>Windows Hello (Windows devices)</li>
              <li>Fingerprint sensor (Android devices)</li>
              <li>Security key (YubiKey, etc.)</li>
            </ul>
          </div>

          <Button type="primary" onClick={handleComplete} size="large">
            Done
          </Button>
        </Space>
      )}
    </Modal>
  );
}
