/**
 * Table Component with Progressive Disclosure
 *
 * Enhanced table with column visibility controls for better UX on tables with many columns.
 * Features:
 * - Column show/hide controls
 * - Persistent column preferences (localStorage)
 * - Responsive column management
 * - Keyboard accessible column picker
 * - Default visible columns (5-7 recommended)
 */
'use client';

import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnDef,
  VisibilityState,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ColumnConfig<TData> {
  column: ColumnDef<TData, unknown>;
  /** Default visibility (true = shown by default) */
  defaultVisible?: boolean;
  /** Priority level (1=critical, 2=important, 3=nice-to-have) */
  priority?: 1 | 2 | 3;
  /** Column category for grouping in column picker */
  category?: string;
}

export interface TableWithColumnToggleProps<TData> {
  data: TData[];
  columns: ColumnConfig<TData>[];
  pageSize?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  className?: string;
  /** Table ID for localStorage persistence */
  tableId?: string;
  /** Show column picker by default */
  showColumnPicker?: boolean;
}

const TableWithColumnToggle = <TData,>({
  data,
  columns: columnConfigs,
  pageSize = 10,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  tableId,
  showColumnPicker = true,
}: TableWithColumnToggleProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  // Extract columns from configs
  const columns = columnConfigs.map((config) => config.column);

  // Initialize column visibility from config or localStorage
  useEffect(() => {
    const storageKey = tableId ? `table-columns-${tableId}` : null;

    let initialVisibility: VisibilityState = {};

    // Try to load from localStorage
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          initialVisibility = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Failed to load column visibility from localStorage', e);
      }
    }

    // If no saved state, use defaults from config
    if (Object.keys(initialVisibility).length === 0) {
      columnConfigs.forEach((config, index) => {
        const columnId = String(config.column.id || index);
        // Default visible unless explicitly set to false
        initialVisibility[columnId] = config.defaultVisible !== false;
      });
    }

    setColumnVisibility(initialVisibility);
  }, [tableId, columnConfigs]);

  // Save column visibility to localStorage
  useEffect(() => {
    if (tableId && Object.keys(columnVisibility).length > 0) {
      try {
        localStorage.setItem(`table-columns-${tableId}`, JSON.stringify(columnVisibility));
      } catch (e) {
        console.warn('Failed to save column visibility to localStorage', e);
      }
    }

    // Count visible columns
    const count = Object.values(columnVisibility).filter(Boolean).length;
    setVisibleCount(count);
  }, [columnVisibility, tableId]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Group columns by category for the picker
  const columnsByCategory = React.useMemo(() => {
    const grouped: Record<string, typeof columnConfigs> = {};

    columnConfigs.forEach((config) => {
      const category = config.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(config);
    });

    return grouped;
  }, [columnConfigs]);

  // Reset to defaults
  const resetColumns = () => {
    const defaultVisibility: VisibilityState = {};
    columnConfigs.forEach((config, index) => {
      const columnId = String(config.column.id || index);
      defaultVisibility[columnId] = config.defaultVisible !== false;
    });
    setColumnVisibility(defaultVisibility);
  };

  // Show all columns
  const showAllColumns = () => {
    const allVisible: VisibilityState = {};
    columnConfigs.forEach((config, index) => {
      const columnId = String(config.column.id || index);
      allVisible[columnId] = true;
    });
    setColumnVisibility(allVisible);
  };

  // Hide all columns (except first one to prevent empty table)
  const hideAllColumns = () => {
    const allHidden: VisibilityState = {};
    columnConfigs.forEach((config, index) => {
      const columnId = String(config.column.id || index);
      // Keep first column visible
      allHidden[columnId] = index === 0;
    });
    setColumnVisibility(allHidden);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={clsx('table-container', className)}>
        <table className="table">
          <thead>
            <tr>
              {table.getVisibleLeafColumns().map((column) => (
                <th key={column.id}>
                  {flexRender(column.columnDef.header, {} as any)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row-loading">
                {table.getVisibleLeafColumns().map((column) => (
                  <td key={column.id}>
                    <div className="table-skeleton" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={clsx('table-container', className)}>
        {showColumnPicker && (
          <div className="table-toolbar">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowColumnModal(true)}
              aria-label="Customize columns"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 4H5a2 2 0 00-2 2v6a2 2 0 002 2h4m0-10h6a2 2 0 012 2v6a2 2 0 01-2 2h-6m0 6h10a2 2 0 002-2v-6a2 2 0 00-2-2H9m0 12V8"
                />
              </svg>
              Columns ({visibleCount})
            </Button>
          </div>
        )}
        <table className="table">
          <thead>
            <tr>
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={table.getVisibleLeafColumns().length} className="table-empty">
                <div className="table-empty-content">
                  <svg
                    className="table-empty-icon"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="table-empty-message">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className={clsx('table-container', className)}>
        {/* Column Picker Toolbar */}
        {showColumnPicker && (
          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <span className="text-sm text-text-secondary">
                Showing {visibleCount} of {columnConfigs.length} columns
              </span>
            </div>
            <div className="table-toolbar-right">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowColumnModal(true)}
                aria-label="Customize columns"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 4H5a2 2 0 00-2 2v6a2 2 0 002 2h4m0-10h6a2 2 0 012 2v6a2 2 0 01-2 2h-6m0 6h10a2 2 0 002-2v-6a2 2 0 00-2-2H9m0 12V8"
                  />
                </svg>
                Columns
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={clsx({
                        'table-header-sortable': canSort,
                        'table-header-sorted': isSorted,
                      })}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      onKeyDown={(e) => {
                        if (canSort && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          header.column.getToggleSortingHandler()?.(e as React.KeyboardEvent);
                        }
                      }}
                      tabIndex={canSort ? 0 : undefined}
                      role={canSort ? 'button' : undefined}
                      aria-sort={
                        isSorted === 'asc'
                          ? 'ascending'
                          : isSorted === 'desc'
                          ? 'descending'
                          : undefined
                      }
                    >
                      <div className="table-header-content">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="table-sort-icon" aria-hidden="true">
                            {isSorted === 'asc' ? (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 4l3 4H5l3-4z" />
                              </svg>
                            ) : isSorted === 'desc' ? (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 12l-3-4h6l-3 4z" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 4l3 4H5l3-4zm0 8l-3-4h6l-3 4z" opacity="0.3" />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={clsx({
                  'table-row-clickable': !!onRowClick,
                })}
                onClick={() => onRowClick?.(row.original)}
                onKeyDown={(e) => {
                  if (onRowClick && e.key === 'Enter') {
                    onRowClick(row.original);
                  }
                }}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data.length > pageSize && (
          <div className="table-pagination">
            <div className="table-pagination-info">
              Showing {table.getState().pagination.pageIndex * pageSize + 1} to{' '}
              {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, data.length)} of{' '}
              {data.length} results
            </div>
            <div className="table-pagination-controls">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className="table-pagination-pages">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Column Picker Modal */}
      <Modal
        isOpen={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        title="Customize Columns"
        size="md"
      >
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={showAllColumns}>
              Show All
            </Button>
            <Button variant="secondary" size="sm" onClick={hideAllColumns}>
              Hide All
            </Button>
            <Button variant="secondary" size="sm" onClick={resetColumns}>
              Reset to Default
            </Button>
          </div>

          {/* Column list by category */}
          {Object.entries(columnsByCategory).map(([category, configs]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">{category}</h3>
              <div className="space-y-1">
                {configs.map((config, index) => {
                  const column = table.getColumn(String(config.column.id || index));
                  if (!column) return null;

                  const priorityBadge =
                    config.priority === 1
                      ? '🔴'
                      : config.priority === 2
                      ? '🟡'
                      : config.priority === 3
                      ? '🟢'
                      : '';

                  return (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 p-2 hover:bg-surface-secondary rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-border-default"
                      />
                      <span className="flex-1 text-sm text-text-primary">
                        {priorityBadge && <span className="mr-1">{priorityBadge}</span>}
                        {typeof config.column.header === 'string'
                          ? config.column.header
                          : column.id}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="text-xs text-text-secondary">
            <p>🔴 Critical columns • 🟡 Important • 🟢 Optional</p>
            <p className="mt-1">Your preferences are saved automatically</p>
          </div>
        </div>
      </Modal>
    </>
  );
};

// Memoized component
export const TableWithColumnToggleComponent = React.memo(
  TableWithColumnToggle,
  (prevProps, nextProps) => {
    return (
      prevProps.data === nextProps.data &&
      prevProps.columns === nextProps.columns &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.pageSize === nextProps.pageSize &&
      prevProps.emptyMessage === nextProps.emptyMessage &&
      prevProps.onRowClick === nextProps.onRowClick &&
      prevProps.className === nextProps.className &&
      prevProps.tableId === nextProps.tableId
    );
  }
) as <TData>(props: TableWithColumnToggleProps<TData>) => React.ReactElement;

export { TableWithColumnToggleComponent as TableWithColumnToggle };
