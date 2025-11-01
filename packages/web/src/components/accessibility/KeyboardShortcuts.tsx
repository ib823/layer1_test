/**
 * Keyboard Shortcuts Component
 *
 * Provides keyboard shortcuts with visual hints.
 */

'use client';

import { useEffect } from 'react';
import { Modal, Typography, Divider } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  /** Category for grouping */
  category?: string;
}

export interface KeyboardShortcutsProps {
  /** Available shortcuts */
  shortcuts: KeyboardShortcut[];
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Keyboard Shortcuts Hook
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'ctrl+s', description: 'Save', action: () => save() },
 *   { key: '/', description: 'Search', action: () => focusSearch() },
 *   { key: 'esc', description: 'Close', action: () => close() }
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = getKeyString(e);

      const shortcut = shortcuts.find((s) => s.key.toLowerCase() === key.toLowerCase());

      if (shortcut) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          // Allow shortcuts that explicitly include input elements (like ctrl+s)
          if (!shortcut.key.includes('ctrl') && !shortcut.key.includes('cmd')) {
            return;
          }
        }

        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Convert keyboard event to shortcut string
 */
function getKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];

  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');

  const key = e.key.toLowerCase();
  if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
    parts.push(key === ' ' ? 'space' : key);
  }

  return parts.join('+');
}

/**
 * Keyboard Shortcuts Help Modal
 */
export function KeyboardShortcutsHelp({
  shortcuts,
  visible,
  onClose,
}: {
  shortcuts: KeyboardShortcut[];
  visible: boolean;
  onClose: () => void;
}) {
  // Group shortcuts by category
  const grouped = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Modal
      title={
        <span>
          <QuestionCircleOutlined className="mr-2" />
          Keyboard Shortcuts
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {Object.entries(grouped).map(([category, categoryShortcuts]) => (
        <div key={category} className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">{category}</h3>
          <div className="space-y-2">
            {categoryShortcuts.map((shortcut) => (
              <div key={shortcut.key} className="flex justify-between items-center">
                <Text>{shortcut.description}</Text>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                  {formatShortcutKey(shortcut.key)}
                </kbd>
              </div>
            ))}
          </div>
          <Divider />
        </div>
      ))}
    </Modal>
  );
}

/**
 * Format shortcut key for display
 */
function formatShortcutKey(key: string): string {
  return key
    .split('+')
    .map((part) => {
      switch (part.toLowerCase()) {
        case 'ctrl':
          return '⌃';
        case 'cmd':
          return '⌘';
        case 'shift':
          return '⇧';
        case 'alt':
          return '⌥';
        case 'space':
          return 'Space';
        case 'esc':
        case 'escape':
          return 'Esc';
        default:
          return part.toUpperCase();
      }
    })
    .join(' + ');
}

/**
 * Common keyboard shortcuts for data tables
 */
export const commonDataTableShortcuts = (actions: {
  refresh?: () => void;
  search?: () => void;
  export?: () => void;
  help?: () => void;
}): KeyboardShortcut[] => [
  {
    key: 'ctrl+r',
    description: 'Refresh data',
    action: actions.refresh || (() => {}),
    category: 'Data',
  },
  {
    key: '/',
    description: 'Focus search',
    action: actions.search || (() => {}),
    category: 'Navigation',
  },
  {
    key: 'ctrl+e',
    description: 'Export data',
    action: actions.export || (() => {}),
    category: 'Actions',
  },
  {
    key: '?',
    description: 'Show shortcuts',
    action: actions.help || (() => {}),
    category: 'Help',
  },
];
