'use client';

import { useState, useEffect } from 'react';
import { Card, Switch, Button, Space, Alert, Typography, Tabs, message } from 'antd';
import { SafetyOutlined, MobileOutlined, KeyOutlined, QrcodeOutlined } from '@ant-design/icons';
import { TOTPSetup } from '@/components/security/TOTPSetup';
import { PasskeySetup } from '@/components/security/PasskeySetup';
import { BackupCodes } from '@/components/security/BackupCodes';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface MFAConfig {
  mfaEnabled: boolean;
  totpEnabled: boolean;
  passkeyEnabled: boolean;
  preferredMethod: 'totp' | 'passkey' | null;
  passkeyCount: number;
}

export default function MFAPage() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<MFAConfig>({
    mfaEnabled: false,
    totpEnabled: false,
    passkeyEnabled: false,
    preferredMethod: null,
    passkeyCount: 0,
  });
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [showPasskeySetup, setShowPasskeySetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    fetchMFAConfig();
  }, []);

  const fetchMFAConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mfa/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      message.error('Failed to load MFA configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleMFAToggle = async (enabled: boolean) => {
    if (!enabled && config.mfaEnabled) {
      // Disabling MFA - confirm with user
      if (!confirm('Are you sure you want to disable Multi-Factor Authentication? This will reduce your account security.')) {
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch('/api/mfa/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        message.success(`MFA ${enabled ? 'enabled' : 'disabled'} successfully`);
        await fetchMFAConfig();
      } else {
        throw new Error('Failed to toggle MFA');
      }
    } catch (error) {
      message.error('Failed to update MFA settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTOTPSetupComplete = () => {
    setShowTOTPSetup(false);
    setShowBackupCodes(true);
    fetchMFAConfig();
  };

  const handlePasskeySetupComplete = () => {
    setShowPasskeySetup(false);
    message.success('Passkey registered successfully');
    fetchMFAConfig();
  };

  const getSecurityLevel = (): { level: string; color: string; description: string } => {
    if (config.passkeyEnabled && config.totpEnabled) {
      return {
        level: 'Maximum',
        color: '#52c41a',
        description: 'Both TOTP and Passkey enabled - highest security',
      };
    }
    if (config.passkeyEnabled) {
      return {
        level: 'High',
        color: '#1890ff',
        description: 'Passkey enabled - biometric authentication',
      };
    }
    if (config.totpEnabled) {
      return {
        level: 'Medium',
        color: '#faad14',
        description: 'TOTP enabled - time-based codes',
      };
    }
    return {
      level: 'Low',
      color: '#ff4d4f',
      description: 'No MFA enabled - password only',
    };
  };

  const securityLevel = getSecurityLevel();

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <SafetyOutlined /> Multi-Factor Authentication
      </Title>
      <Paragraph type="secondary">
        Add an extra layer of security to your account by requiring a second form of authentication in addition to your password.
      </Paragraph>

      {/* Security Level Indicator */}
      <Card style={{ marginBottom: '24px', borderLeft: `4px solid ${securityLevel.color}` }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Current Security Level: </Text>
              <Text strong style={{ color: securityLevel.color, fontSize: '18px' }}>
                {securityLevel.level}
              </Text>
            </div>
            <Switch
              checked={config.mfaEnabled}
              onChange={handleMFAToggle}
              loading={loading}
              checkedChildren="MFA On"
              unCheckedChildren="MFA Off"
            />
          </div>
          <Text type="secondary">{securityLevel.description}</Text>
        </Space>
      </Card>

      {/* Alert for no MFA */}
      {!config.mfaEnabled && (
        <Alert
          message="MFA is not enabled"
          description="Your account is protected by password only. Enable MFA to add an extra layer of security."
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* MFA Methods Tabs */}
      <Card>
        <Tabs defaultActiveKey="totp">
          <TabPane
            tab={
              <span>
                <MobileOutlined />
                Authenticator App (TOTP)
              </span>
            }
            key="totp"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>Time-Based One-Time Password (TOTP)</Title>
                <Paragraph>
                  Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator to generate time-based verification codes.
                </Paragraph>
              </div>

              {config.totpEnabled ? (
                <Alert
                  message="TOTP is enabled"
                  description={
                    <Space direction="vertical">
                      <Text>Your authenticator app is set up and ready to use.</Text>
                      {config.preferredMethod === 'totp' && (
                        <Text type="success">This is your preferred MFA method.</Text>
                      )}
                    </Space>
                  }
                  type="success"
                  showIcon
                  action={
                    <Space>
                      <Button size="small" onClick={() => setShowBackupCodes(true)}>
                        View Backup Codes
                      </Button>
                      <Button size="small" danger onClick={() => handleMFAToggle(false)}>
                        Disable
                      </Button>
                    </Space>
                  }
                />
              ) : (
                <div>
                  <Alert
                    message="TOTP is not enabled"
                    description="Set up an authenticator app to generate verification codes when you sign in."
                    type="info"
                    showIcon
                  />
                  <Button
                    type="primary"
                    icon={<QrcodeOutlined />}
                    onClick={() => setShowTOTPSetup(true)}
                    style={{ marginTop: '16px' }}
                  >
                    Set Up Authenticator App
                  </Button>
                </div>
              )}
            </Space>
          </TabPane>

          <TabPane
            tab={
              <span>
                <KeyOutlined />
                Passkeys
              </span>
            }
            key="passkey"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>Passkeys (WebAuthn)</Title>
                <Paragraph>
                  Passkeys use biometric authentication (Face ID, Touch ID, Windows Hello) or security keys. They are more secure than passwords and can't be phished.
                </Paragraph>
              </div>

              {config.passkeyEnabled ? (
                <Alert
                  message={`${config.passkeyCount} passkey${config.passkeyCount > 1 ? 's' : ''} registered`}
                  description={
                    <Space direction="vertical">
                      <Text>You can sign in using Face ID, Touch ID, or your registered security key.</Text>
                      {config.preferredMethod === 'passkey' && (
                        <Text type="success">This is your preferred MFA method.</Text>
                      )}
                    </Space>
                  }
                  type="success"
                  showIcon
                  action={
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => setShowPasskeySetup(true)}
                    >
                      Add Another Passkey
                    </Button>
                  }
                />
              ) : (
                <div>
                  <Alert
                    message="No passkeys registered"
                    description="Register a passkey to use biometric authentication or a security key."
                    type="info"
                    showIcon
                  />
                  <Button
                    type="primary"
                    icon={<KeyOutlined />}
                    onClick={() => setShowPasskeySetup(true)}
                    style={{ marginTop: '16px' }}
                  >
                    Register Passkey
                  </Button>
                </div>
              )}
            </Space>
          </TabPane>
        </Tabs>
      </Card>

      {/* Best Practices */}
      <Card title="Best Practices" style={{ marginTop: '24px' }}>
        <Space direction="vertical" size="small">
          <Text>• Enable at least one MFA method to protect your account</Text>
          <Text>• Passkeys are more secure and convenient than TOTP</Text>
          <Text>• Keep your backup codes in a safe place</Text>
          <Text>• Register multiple passkeys on different devices for redundancy</Text>
          <Text>• Never share your TOTP secret or backup codes</Text>
        </Space>
      </Card>

      {/* Setup Modals */}
      {showTOTPSetup && (
        <TOTPSetup
          visible={showTOTPSetup}
          onClose={() => setShowTOTPSetup(false)}
          onComplete={handleTOTPSetupComplete}
        />
      )}

      {showPasskeySetup && (
        <PasskeySetup
          visible={showPasskeySetup}
          onClose={() => setShowPasskeySetup(false)}
          onComplete={handlePasskeySetupComplete}
        />
      )}

      {showBackupCodes && (
        <BackupCodes
          visible={showBackupCodes}
          onClose={() => setShowBackupCodes(false)}
        />
      )}
    </div>
  );
}
