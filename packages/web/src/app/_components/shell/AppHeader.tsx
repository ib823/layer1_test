'use client';

/**
 * AppHeader Component
 *
 * Top navigation bar with logo, global search, tenant switcher, and user menu.
 */

import { Space, Button, Badge, Avatar, Dropdown, Input } from '@sap-framework/ui';
import type { MenuProps } from 'antd';
import { TenantSwitcher } from './TenantSwitcher';
import {
  BellOutlined,
  SearchOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const userMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    label: 'Profile',
    icon: <UserOutlined />,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <SettingOutlined />,
  },
  {
    type: 'divider',
  },
  {
    key: 'help',
    label: 'Help & Support',
    icon: <QuestionCircleOutlined />,
  },
  {
    type: 'divider',
  },
  {
    key: 'logout',
    label: 'Logout',
    icon: <LogoutOutlined />,
    danger: true,
  },
];

export function AppHeader() {
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      // TODO: Implement logout
      console.log('Logout');
    } else {
      console.log('Menu click:', key);
    }
  };

  return (
    <header className="sticky top-0 z-fixed bg-surface-base border-b border-border-default shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Logo + Product Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-primary rounded-md flex items-center justify-center text-white font-bold">
              AB
            </div>
            <div>
              <div className="text-sm font-semibold text-primary">ABeam DataBridge</div>
              <div className="text-xs text-tertiary">GRC Platform</div>
            </div>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-2xl px-8">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search violations, users, roles..."
            size="middle"
            className="w-full"
          />
        </div>

        {/* Right: Tenant Switcher, Notifications, User Menu */}
        <Space size="middle">
          <TenantSwitcher />

          <Badge count={5}>
            <Button
              variant="text"
              icon={<BellOutlined />}
              aria-label="Notifications"
            />
          </Badge>

          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleUserMenuClick,
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              variant="text"
              className="flex items-center gap-2"
              aria-label="User menu"
            >
              <Avatar size="small" className="bg-brand-primary">
                JD
              </Avatar>
              <span className="text-sm">John Doe</span>
            </Button>
          </Dropdown>
        </Space>
      </div>
    </header>
  );
}
