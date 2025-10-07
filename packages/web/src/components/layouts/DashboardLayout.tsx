'use client';

/**
 * Main Dashboard Layout with Ant Design
 * Provides navigation, header, and content area
 */

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
  Button,
  Breadcrumb,
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SafetyOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  DatabaseOutlined,
  TeamOutlined,
  FileTextOutlined,
  AuditOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { Role, Permission } from '@/types/auth';
import { Can } from '../auth/Can';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
  };

  // User dropdown menu
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  // Navigation menu items
  const getMenuItems = (): MenuProps['items'] => {
    const items: MenuProps['items'] = [];

    // Dashboard - available to all roles
    items.push({
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => router.push('/dashboard'),
    });

    // Admin section - System Admin only
    if (hasRole(Role.SYSTEM_ADMIN)) {
      items.push({
        key: 'admin',
        icon: <SafetyOutlined />,
        label: 'Administration',
        children: [
          {
            key: '/admin/dashboard',
            label: 'Admin Dashboard',
            onClick: () => router.push('/admin/dashboard'),
          },
          {
            key: '/admin/tenants',
            label: 'Tenants',
            onClick: () => router.push('/admin/tenants'),
          },
          {
            key: '/admin/connectors',
            label: 'Connectors',
            onClick: () => router.push('/admin/connectors'),
          },
          {
            key: '/admin/system-settings',
            label: 'System Settings',
            onClick: () => router.push('/admin/system-settings'),
          },
        ],
      });
    }

    // Users - Available to admins and compliance managers
    if (hasRole([Role.SYSTEM_ADMIN, Role.TENANT_ADMIN, Role.COMPLIANCE_MANAGER])) {
      items.push({
        key: '/users',
        icon: <TeamOutlined />,
        label: 'Users',
        onClick: () => router.push('/users'),
      });
    }

    // Violations - Available to most roles except regular users
    if (hasRole([Role.SYSTEM_ADMIN, Role.TENANT_ADMIN, Role.COMPLIANCE_MANAGER, Role.AUDITOR])) {
      items.push({
        key: '/violations',
        icon: <AuditOutlined />,
        label: 'Violations',
        onClick: () => router.push('/violations'),
      });
    }

    // Analytics - Available to all except regular users
    if (hasRole([Role.SYSTEM_ADMIN, Role.TENANT_ADMIN, Role.COMPLIANCE_MANAGER, Role.AUDITOR])) {
      items.push({
        key: '/analytics',
        icon: <BarChartOutlined />,
        label: 'Analytics',
        onClick: () => router.push('/analytics'),
      });
    }

    // Reports - Available to all except regular users
    if (hasRole([Role.SYSTEM_ADMIN, Role.TENANT_ADMIN, Role.COMPLIANCE_MANAGER, Role.AUDITOR])) {
      items.push({
        key: '/reports',
        icon: <FileTextOutlined />,
        label: 'Reports',
        onClick: () => router.push('/reports'),
      });
    }

    // My Violations - For regular users
    if (hasRole(Role.USER)) {
      items.push({
        key: '/my-violations',
        icon: <AuditOutlined />,
        label: 'My Violations',
        onClick: () => router.push('/my-violations'),
      });
    }

    return items;
  };

  // Generate breadcrumb
  const generateBreadcrumb = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbItems = [
      {
        title: <HomeOutlined />,
        href: '/dashboard',
      },
    ];

    let currentPath = '';
    paths.forEach((path) => {
      currentPath += `/${path}`;
      breadcrumbItems.push({
        title: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
        href: currentPath,
      });
    });

    return breadcrumbItems;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={250}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          {!collapsed ? (
            <Space>
              <SafetyOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Text strong style={{ color: 'white', fontSize: 16 }}>
                SAP GRC
              </Text>
            </Space>
          ) : (
            <SafetyOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={getMenuItems()}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />

          <Space size="large">
            <Badge count={5}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 20 }} />}
                onClick={() => router.push('/notifications')}
              />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size="large"
                  icon={<UserOutlined />}
                  src={user?.avatar}
                  style={{ backgroundColor: '#1890ff' }}
                />
                <Space direction="vertical" size={0}>
                  <Text strong>{user?.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {user?.roles[0]?.replace('_', ' ').toUpperCase()}
                  </Text>
                </Space>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
          <div style={{ padding: 24, background: '#fff', minHeight: 360 }}>
            <Breadcrumb
              items={generateBreadcrumb()}
              style={{ marginBottom: 16 }}
            />
            {children}
          </div>
        </Content>

        <Layout.Footer style={{ textAlign: 'center' }}>
          SAP GRC Platform © 2025 | Tenant: {user?.tenantName || user?.tenantId}
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
