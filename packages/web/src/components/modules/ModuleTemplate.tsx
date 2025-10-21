'use client';

import React from 'react';
import { Layout, Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { ModuleConfig } from './types';
import { useAuth } from '@/lib/auth/AuthContext';

const { Content } = Layout;

interface ModuleTemplateProps {
  config: ModuleConfig;
  children: React.ReactNode;
}

export const ModuleTemplate: React.FC<ModuleTemplateProps> = ({ config, children }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  // Check if user has permission
  const hasPermission = user && config.allowedRoles.some(role => user.roles.includes(role));

  if (!hasPermission) {
    return (
      <Content style={{ padding: '24px' }}>
        <div style={{ 
          background: '#fff', 
          padding: '48px', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this module.</p>
        </div>
      </Content>
    );
  }

  // Generate breadcrumb items from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbItems = [
    {
      title: (
        <a href="/dashboard">
          <HomeOutlined /> Dashboard
        </a>
      ),
    },
    {
      title: config.name,
    },
    ...pathSegments.slice(2).map((segment, index) => ({
      title: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    })),
  ];

  return (
    <Content style={{ padding: '0 24px', minHeight: '100vh' }}>
      <div style={{ padding: '16px 0' }}>
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <div style={{ 
        background: '#f0f2f5', 
        padding: '24px', 
        borderRadius: '8px' 
      }}>
        {children}
      </div>
    </Content>
  );
};

export default ModuleTemplate;
