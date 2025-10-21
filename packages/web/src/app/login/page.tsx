'use client';

/**
 * Login Page
 * Authentication page with Ant Design components
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Space, Divider, Select, Spin } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { Role } from '@/types/auth';
import type { LoginCredentials } from '@/types/auth';
import './login.css';

const { Title, Text, Link } = Typography;
const { Option } = Select;

function LoginForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devRole, setDevRole] = useState<Role>(Role.SYSTEM_ADMIN);

  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDev = process.env.NODE_ENV === 'development' &&
                process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleSubmit = async (values: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      await login(values);

      // Redirect handled by AuthContext
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use dev credentials
      await login({
        email: 'dev@example.com',
        password: 'dev',
      });
    } catch (err: any) {
      setError(err.message || 'Development login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        {/* Left side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <SafetyOutlined className="branding-icon" />
            <Title level={1} style={{ color: 'white', marginBottom: 16 }}>
              ABeam CoreBridge
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 16 }}>
              Intelligent Enterprise Integration & Governance
            </Text>
            <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.3)', margin: '32px 0' }} />
            <Space direction="vertical" size="large">
              <div>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>
                  ✓ Unified Business Process Monitoring
                </Text>
              </div>
              <div>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>
                  ✓ Cross-System Data Integration
                </Text>
              </div>
              <div>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>
                  ✓ AI-Powered Insights & Analytics
                </Text>
              </div>
              <div>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>
                  ✓ Enterprise-Grade Security & Compliance
                </Text>
              </div>
            </Space>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="login-form-wrapper">
          <Card className="login-card" variant="borderless">
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={2} style={{ marginBottom: 8 }}>
                Welcome Back
              </Title>
              <Text type="secondary">
                Sign in to your account to continue
              </Text>
            </div>

            {error && (
              <Alert
                message="Login Failed"
                description={error}
                type="error"
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 24 }}
              />
            )}

            {isDev && (
              <Alert
                message="Development Mode"
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text>Using mock authentication. Select a role to test:</Text>
                    <Select
                      value={devRole}
                      onChange={setDevRole}
                      style={{ width: '100%' }}
                    >
                      <Option value={Role.SYSTEM_ADMIN}>System Admin</Option>
                      <Option value={Role.TENANT_ADMIN}>Tenant Admin</Option>
                      <Option value={Role.COMPLIANCE_MANAGER}>Compliance Manager</Option>
                      <Option value={Role.AUDITOR}>Auditor</Option>
                      <Option value={Role.USER}>User</Option>
                    </Select>
                  </Space>
                }
                type="info"
                style={{ marginBottom: 24 }}
              />
            )}

            <Form
              form={form}
              name="login"
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
              initialValues={{ remember: true }}
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Email"
                  autoComplete="email"
                  disabled={loading}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  size="large"
                >
                  Sign In
                </Button>
              </Form.Item>

              {isDev && (
                <>
                  <Divider>or</Divider>
                  <Button
                    block
                    size="large"
                    onClick={handleDevLogin}
                    loading={loading}
                  >
                    Quick Dev Login ({devRole})
                  </Button>
                </>
              )}
            </Form>

            <Divider style={{ margin: '24px 0' }} />

            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <Link href="/forgot-password">Forgot password?</Link>
                <Link href="/help">Need help?</Link>
              </Space>
            </div>
          </Card>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              © 2025 ABeam CoreBridge. All rights reserved.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
