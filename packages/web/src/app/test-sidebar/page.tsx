'use client';

import { Sidebar, SidebarItem } from '@/components/ui';
import { useState } from 'react';

const menuItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    href: '/dashboard',
  },
  {
    id: 'violations',
    label: 'Violations',
    icon: '⚠️',
    href: '/violations',
    badge: 45,
    children: [
      {
        id: 'violations-critical',
        label: 'Critical',
        href: '/violations/critical',
        badge: 12,
      },
      {
        id: 'violations-high',
        label: 'High',
        href: '/violations/high',
        badge: 33,
      },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    icon: '👥',
    href: '/users',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: '📈',
    href: '/reports',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    href: '/settings',
  },
];

export default function TestSidebarPage() {
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        items={menuItems}
        currentPath={currentPath}
        onNavigate={(href) => {
          setCurrentPath(href);
          console.log('Navigating to:', href);
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <main style={{ flex: 1, padding: '2rem', marginLeft: collapsed ? '64px' : '280px' }}>
        <h1>Current Page: {currentPath}</h1>
        <p>Click sidebar items to navigate</p>
      </main>
    </div>
  );
}
