/**
 * TableShell Component
 * Wrapper around Ant Design Table with design tokens applied
 * This component provides a base for tables; use with TanStack Table for advanced features
 */

import React from 'react';
import { Table as AntTable, type TableProps as AntTableProps } from 'antd';
import clsx from 'clsx';

export interface TableShellProps<T = any> extends AntTableProps<T> {
  /**
   * Enable row selection
   * @default false
   */
  selectable?: boolean;
}

/**
 * TableShell Component
 *
 * A table component with consistent styling.
 * For advanced features (sorting, filtering, pagination), use TanStack Table with this shell.
 *
 * @example
 * ```tsx
 * <TableShell
 *   columns={columns}
 *   dataSource={data}
 *   rowKey="id"
 *   pagination={{ pageSize: 10 }}
 * />
 * ```
 */
export function TableShell<T extends object = any>({
  className,
  pagination = { pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` },
  bordered = false,
  size = 'middle',
  rowSelection,
  selectable,
  ...props
}: TableShellProps<T>) {
  const finalRowSelection = selectable
    ? rowSelection || {
        type: 'checkbox' as const,
        onChange: (selectedRowKeys: React.Key[]) => {
          console.log('Selected rows:', selectedRowKeys);
        },
      }
    : rowSelection;

  return (
    <AntTable<T>
      className={clsx('rounded-md', className)}
      pagination={pagination}
      bordered={bordered}
      size={size}
      rowSelection={finalRowSelection}
      {...props}
    />
  );
}

TableShell.displayName = 'TableShell';
