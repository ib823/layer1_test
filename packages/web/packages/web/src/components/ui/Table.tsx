import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { clsx } from 'clsx';

export interface TableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  className?: string;
}

export function Table<TData>({
  data,
  columns,
  isLoading = false,
  pageSize = 10,
  onRowClick,
  className = '',
}: TableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  if (isLoading) {
    return (
      <div className={clsx('card', className)}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {columns.map((column, i) => (
                  <th key={i}>
                    <div className="skeleton skeleton-text" style={{ width: '100px' }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j}>
                      <div className="skeleton skeleton-text" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={clsx('card', className)}>
        <div className="empty-state">
          <svg
            className="empty-state-icon"
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
          <h3 className="empty-state-title">No data found</h3>
          <p className="empty-state-description">
            There are no items to display at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('card', className)}>
      <div className="table-container">
        <table className="table" role="table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={clsx('table-header', {
                            'table-header-sortable': canSort,
                            'table-header-sorted': isSorted,
                          })}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              header.column.getToggleSortingHandler()?.(e);
                            }
                          }}
                          tabIndex={canSort ? 0 : undefined}
                          role={canSort ? 'button' : undefined}
                          aria-sort={
                            isSorted
                              ? isSorted === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : undefined
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="table-sort-icon" aria-hidden="true">
                              {isSorted === 'asc' ? '↑' : isSorted === 'desc' ? '↓' : '↕'}
                            </span>
                          )}
                        </div>
                      )}
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
                onKeyPress={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
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
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="table-pagination">
          <div className="table-pagination-info">
            Showing {table.getState().pagination.pageIndex * pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * pageSize,
              data.length
            )}{' '}
            of {data.length} results
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
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
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
  );
}