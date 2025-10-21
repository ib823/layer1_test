/**
 * Example: How to integrate SoD module into DashboardLayout.tsx
 * 
 * Add this to your menu items in packages/web/src/components/layouts/DashboardLayout.tsx
 */

import { AppstoreOutlined, SecurityScanOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

// Add to your existing menu items array
const menuItems: MenuProps['items'] = [
  // ... existing items ...
  
  {
    key: 'modules',
    label: 'Modules',
    icon: <AppstoreOutlined />,
    children: [
      {
        key: 'sod',
        label: 'SoD Analysis',
        icon: <SecurityScanOutlined />,
        children: [
          {
            key: 'sod-dashboard',
            label: 'Dashboard',
            onClick: () => router.push('/modules/sod/dashboard'),
          },
          {
            key: 'sod-violations',
            label: 'Violations',
            onClick: () => router.push('/modules/sod/violations'),
          },
          {
            key: 'sod-config',
            label: 'Configuration',
            onClick: () => router.push('/modules/sod/config'),
          },
          {
            key: 'sod-reports',
            label: 'Reports',
            onClick: () => router.push('/modules/sod/reports'),
          },
        ],
      },
      // Future modules can be added here:
      // {
      //   key: 'einvoice',
      //   label: 'E-Invoice',
      //   icon: <FileTextOutlined />,
      //   children: [...],
      // },
    ],
  },
  
  // ... rest of menu items ...
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ... existing code ...
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <Menu 
          theme="dark" 
          defaultSelectedKeys={['dashboard']} 
          mode="inline" 
          items={menuItems}
        />
      </Sider>
      {/* ... rest of layout ... */}
    </Layout>
  );
}
