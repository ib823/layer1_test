'use client';

/**
 * AppSidebar Component
 *
 * Left navigation sidebar with module links.
 * Collapsible on mobile, persistent on desktop.
 */

import { useState } from 'react';
import { Menu, Button } from '@sap-framework/ui';
import type { MenuProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import {
  DashboardOutlined,
  SafetyOutlined,
  FileProtectOutlined,
  ReconciliationOutlined,
  BarChartOutlined,
  TeamOutlined,
  DatabaseOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: 'sod',
    icon: <SafetyOutlined />,
    label: 'Segregation of Duties',
    children: [
      {
        key: 'sod-violations',
        label: 'Violations Inbox',
      },
      {
        key: 'sod-risk-workbench',
        label: 'Risk Workbench',
      },
      {
        key: 'sod-simulation',
        label: 'Simulation',
      },
      {
        key: 'sod-certification',
        label: 'Certification',
      },
    ],
  },
  {
    key: 'lhdn',
    icon: <FileProtectOutlined />,
    label: 'LHDN e-Invoice',
    children: [
      {
        key: 'lhdn-monitor',
        label: 'Monitor',
      },
      {
        key: 'lhdn-operations',
        label: 'Operations',
      },
      {
        key: 'lhdn-config',
        label: 'Configuration',
      },
    ],
  },
  {
    key: 'invoice-matching',
    icon: <ReconciliationOutlined />,
    label: 'Invoice Matching',
  },
  {
    key: 'gl-anomaly',
    icon: <BarChartOutlined />,
    label: 'GL Anomaly Detection',
  },
  {
    key: 'vendor-quality',
    icon: <DatabaseOutlined />,
    label: 'Vendor Data Quality',
  },
  {
    key: 'user-access',
    icon: <TeamOutlined />,
    label: 'User Access Review',
  },
  {
    type: 'divider',
  },
  {
    key: 'admin',
    icon: <SettingOutlined />,
    label: 'Administration',
  },
];

interface AppSidebarProps {
  tenantId?: string;
}

export function AppSidebar({ tenantId }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Extract current selected key from pathname
  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const selectedKey = pathSegments[pathSegments.length - 1] || 'dashboard';

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const tenant = tenantId || 'demo';

    // Map menu keys to routes
    const routeMap: Record<string, string> = {
      dashboard: `/t/${tenant}/dashboard`,
      'sod-violations': `/t/${tenant}/sod/violations`,
      'sod-risk-workbench': `/t/${tenant}/sod/risk-workbench`,
      'sod-simulation': `/t/${tenant}/sod/simulation`,
      'sod-certification': `/t/${tenant}/sod/certification`,
      'lhdn-monitor': `/t/${tenant}/lhdn/monitor`,
      'lhdn-operations': `/t/${tenant}/lhdn/operations`,
      'lhdn-config': `/t/${tenant}/lhdn/config`,
      'invoice-matching': `/t/${tenant}/invoice-matching`,
      'gl-anomaly': `/t/${tenant}/gl-anomaly`,
      'vendor-quality': `/t/${tenant}/vendor-quality`,
      'user-access': `/t/${tenant}/user-access`,
      admin: `/t/${tenant}/admin`,
    };

    const route = routeMap[key];
    if (route) {
      router.push(route);
    }
  };

  return (
    <aside
      className={`
        flex flex-col
        bg-surface-base
        border-r border-border-default
        transition-all duration-300
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Collapse Toggle */}
      <div className="flex items-center justify-end p-4 border-b border-border-default">
        <Button
          variant="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={['sod', 'lhdn']}
          inlineCollapsed={collapsed}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-none"
        />
      </nav>

      {/* Bottom: Version/Help */}
      {!collapsed && (
        <div className="p-4 border-t border-border-default text-xs text-tertiary">
          <div>Version 1.0.0</div>
          <div className="mt-1">© 2025 ABeam Consulting</div>
        </div>
      )}
    </aside>
  );
}
