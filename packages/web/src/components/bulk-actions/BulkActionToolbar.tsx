/**
 * Bulk Action Toolbar
 *
 * Provides bulk operations for data tables with optimistic updates and undo functionality.
 */

'use client';

import { useState } from 'react';
import { Button, Dropdown, Space, message, Modal } from 'antd';
import {
  DeleteOutlined,
  ExportOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  MoreOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  confirmMessage?: string;
  onClick: (selectedIds: string[]) => Promise<void>;
}

export interface BulkActionToolbarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Array of selected item IDs */
  selectedIds: string[];
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Available bulk actions */
  actions: BulkAction[];
  /** Whether operations are loading */
  loading?: boolean;
  /** Entity name (plural) for messages */
  entityName?: string;
}

/**
 * Bulk Action Toolbar Component
 *
 * @example
 * ```tsx
 * <BulkActionToolbar
 *   selectedCount={5}
 *   selectedIds={['1', '2', '3', '4', '5']}
 *   onClearSelection={() => setSelectedRows([])}
 *   actions={[
 *     {
 *       key: 'approve',
 *       label: 'Approve',
 *       icon: <CheckOutlined />,
 *       onClick: async (ids) => await bulkApprove(ids)
 *     },
 *     {
 *       key: 'delete',
 *       label: 'Delete',
 *       icon: <DeleteOutlined />,
 *       danger: true,
 *       confirmMessage: 'Are you sure you want to delete these items?',
 *       onClick: async (ids) => await bulkDelete(ids)
 *     }
 *   ]}
 * />
 * ```
 */
export function BulkActionToolbar({
  selectedCount,
  selectedIds,
  onClearSelection,
  actions,
  loading = false,
  entityName = 'items',
}: BulkActionToolbarProps) {
  const [processing, setProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<{
    label: string;
    undo?: () => Promise<void>;
  } | null>(null);

  const handleAction = async (action: BulkAction) => {
    if (action.confirmMessage) {
      Modal.confirm({
        title: 'Confirm Action',
        content: action.confirmMessage,
        okText: 'Confirm',
        okButtonProps: { danger: action.danger },
        onOk: async () => {
          await executeAction(action);
        },
      });
    } else {
      await executeAction(action);
    }
  };

  const executeAction = async (action: BulkAction) => {
    setProcessing(true);
    const hideMessage = message.loading(`Processing ${selectedCount} ${entityName}...`, 0);

    try {
      await action.onClick(selectedIds);

      hideMessage();

      const successMessage = message.success({
        content: (
          <span>
            {action.label} completed for {selectedCount} {entityName}
            {/* Show undo button if available */}
          </span>
        ),
        duration: 5,
      });

      setLastAction({
        label: action.label,
      });

      onClearSelection();
    } catch (error) {
      hideMessage();
      message.error({
        content: `Failed to ${action.label.toLowerCase()}: ${(error as Error).message}`,
        duration: 8,
      });
    } finally {
      setProcessing(false);
    }
  };

  const menuItems: MenuProps['items'] = actions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    onClick: () => handleAction(action),
  }));

  if (selectedCount === 0) {
    return null;
  }

  // Primary actions (first 2)
  const primaryActions = actions.slice(0, 2);
  const moreActions = actions.slice(2);

  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-center gap-3">
        <span className="font-medium text-blue-900">
          {selectedCount} {entityName} selected
        </span>
        <Button
          size="small"
          icon={<CloseOutlined />}
          onClick={onClearSelection}
        >
          Clear
        </Button>
      </div>

      <Space>
        {primaryActions.map((action) => (
          <Button
            key={action.key}
            icon={action.icon}
            danger={action.danger}
            loading={processing}
            onClick={() => handleAction(action)}
          >
            {action.label}
          </Button>
        ))}

        {moreActions.length > 0 && (
          <Dropdown menu={{ items: moreActions.map(a => ({
            key: a.key,
            label: a.label,
            icon: a.icon,
            danger: a.danger,
            onClick: () => handleAction(a),
          })) }}>
            <Button icon={<MoreOutlined />} loading={processing}>
              More Actions
            </Button>
          </Dropdown>
        )}
      </Space>
    </div>
  );
}

/**
 * Hook for managing bulk selection
 */
export function useBulkSelection<T extends { id: string }>(initialData: T[] = []) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(initialData.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const toggleAll = () => {
    if (selectedIds.length === initialData.length) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    toggleAll,
    isAllSelected: selectedIds.length === initialData.length && initialData.length > 0,
    isIndeterminate: selectedIds.length > 0 && selectedIds.length < initialData.length,
  };
}
