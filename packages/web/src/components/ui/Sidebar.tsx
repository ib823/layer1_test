'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href: string;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface SidebarProps {
  items: SidebarItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  currentPath,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderItem = (item: SidebarItem, level = 0) => {
    const isActive = currentPath === item.href;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <div
          className={clsx('sidebar-item', {
            'sidebar-item-active': isActive,
            'sidebar-item-collapsed': collapsed,
          })}
          style={{ paddingLeft: `${level * 16 + 16}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onNavigate(item.href);
            }
          }}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (hasChildren) {
                toggleExpanded(item.id);
              } else {
                onNavigate(item.href);
              }
            }
          }}
        >
          {item.icon && <span className="sidebar-item-icon">{item.icon}</span>}
          {!collapsed && (
            <>
              <span className="sidebar-item-label">{item.label}</span>
              {item.badge && (
                <span className="sidebar-item-badge">{item.badge}</span>
              )}
              {hasChildren && (
                <span className="sidebar-item-arrow">
                  {isExpanded ? '▼' : '▶'}
                </span>
              )}
            </>
          )}
        </div>
        {hasChildren && isExpanded && !collapsed && (
          <div className="sidebar-submenu">
            {item.children!.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={clsx('sidebar', { 'sidebar-collapsed': collapsed })}>
      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && <div className="sidebar-logo">SAP GRC</div>}
        {onToggleCollapse && (
          <button
            className="sidebar-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" role="navigation">
        {items.map((item) => renderItem(item))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">U</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">User Name</div>
              <div className="sidebar-user-role">Admin</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
