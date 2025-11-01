/**
 * Enhanced Module Data Grid with Column Toggle
 *
 * This component bridges ModuleDataGrid's configuration API with TableWithColumnToggle
 * to provide progressive disclosure for tables with many columns.
 *
 * Key improvements over standard ModuleDataGrid:
 * - Column visibility toggle (show/hide columns)
 * - Persistent column preferences (localStorage)
 * - Better mobile experience (shows only 5-7 columns by default)
 * - Keyboard accessible column picker
 *
 * DEFECT-037: Table overload - too many columns
 * DEFECT-049: Mobile usability issues
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Input, Select, DatePicker, Button, Space, Dropdown, App, Tag, Spin } from 'antd';
import type { MenuProps } from 'antd';
import { SearchOutlined, FilterOutlined, ExportOutlined, MoreOutlined } from '@ant-design/icons';
import { DataGridConfig } from './types';
import { TableWithColumnToggle, ColumnConfig } from '@/components/ui/TableWithColumnToggle';
import { ColumnDef } from '@tanstack/react-table';

const { RangePicker } = DatePicker;

interface ModuleDataGridEnhancedProps {
  config: DataGridConfig;
}

export const ModuleDataGridEnhanced: React.FC<ModuleDataGridEnhancedProps> = ({ config }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, [page, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...filters,
      });

      const response = await fetch(`${config.endpoint}?${queryParams}`);
      const result = await response.json();

      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      message.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPage(1);
  };

  const handleExport = () => {
    message.info('Export functionality will be implemented');
  };

  const bulkActionMenuItems: MenuProps['items'] = config.bulkActions?.map(action => ({
    key: action.key,
    label: action.label,
    onClick: () => {
      action.onClick(selectedRowKeys as string[]);
      setSelectedRowKeys([]);
    },
  })) || [];

  // Convert ModuleDataGrid column config to TableWithColumnToggle format
  const columnConfigs: ColumnConfig<any>[] = config.columns.map((col, index) => {
    // Determine default visibility based on column priority
    // Show first 5-7 columns by default (Miller's Law)
    const defaultVisible = index < 7;

    // Assign priority based on column position and type
    let priority: 1 | 2 | 3 = 2; // Default: important
    if (index < 3) {
      priority = 1; // First 3 columns are critical (usually ID, name, status)
    } else if (index >= 7) {
      priority = 3; // Columns after 7th are nice-to-have
    }

    // Create TanStack Table column definition
    const column: ColumnDef<any, any> = {
      id: col.dataIndex as string || `column-${index}`,
      accessorKey: col.dataIndex as string,
      header: col.title as string,
      cell: (info) => {
        const value = info.getValue();

        // Handle custom render from ModuleDataGrid config
        if (col.render) {
          return col.render(value, info.row.original, index);
        }

        // Default rendering
        return value;
      },
      enableSorting: !!col.sorter,
    };

    return {
      column,
      defaultVisible,
      priority,
      category: 'Data',
    };
  });

  // Add actions column (always visible, high priority)
  columnConfigs.push({
    column: {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const record = info.row.original;
        const menuItems: MenuProps['items'] = config.actions.map(action => ({
          key: action.key,
          label: action.label,
          icon: action.icon,
          danger: action.danger,
          onClick: () => action.onClick(record),
        }));

        const recordIdentifier =
          record.name ||
          record.userName ||
          record.title ||
          record.description ||
          record.id ||
          'item';

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              aria-label={`Actions for ${recordIdentifier}`}
              aria-haspopup="true"
              aria-expanded={false}
            />
          </Dropdown>
        );
      },
      enableSorting: false,
    },
    defaultVisible: true,
    priority: 1, // Always visible
    category: 'Actions',
  });

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
      {/* Filter Bar */}
      <Space style={{ marginBottom: '16px', width: '100%', flexWrap: 'wrap' }}>
        {config.filters.map(filter => {
          switch (filter.type) {
            case 'search':
              return (
                <Input
                  key={filter.key}
                  placeholder={filter.label}
                  prefix={<SearchOutlined />}
                  style={{ width: 200 }}
                  onChange={e => handleFilterChange(filter.key, e.target.value)}
                  allowClear
                  aria-label={filter.label}
                />
              );
            case 'select':
              return (
                <Select
                  key={filter.key}
                  placeholder={filter.label}
                  style={{ width: 200 }}
                  options={filter.options}
                  onChange={value => handleFilterChange(filter.key, value)}
                  allowClear
                  aria-label={filter.label}
                />
              );
            case 'dateRange':
              return (
                <RangePicker
                  key={filter.key}
                  onChange={dates => {
                    if (dates) {
                      handleFilterChange(`${filter.key}_start`, dates[0]?.toISOString());
                      handleFilterChange(`${filter.key}_end`, dates[1]?.toISOString());
                    } else {
                      handleFilterChange(`${filter.key}_start`, null);
                      handleFilterChange(`${filter.key}_end`, null);
                    }
                  }}
                />
              );
            default:
              return null;
          }
        })}
        <Button icon={<ExportOutlined />} onClick={handleExport} aria-label="Export data">
          Export
        </Button>
      </Space>

      {/* Bulk Actions */}
      {selectedRowKeys.length > 0 && config.bulkActions && (
        <div
          style={{ marginBottom: '16px', padding: '8px', background: '#e6f7ff', borderRadius: '4px' }}
          role="status"
          aria-live="polite"
        >
          <Space>
            <span>{selectedRowKeys.length} selected</span>
            <Dropdown menu={{ items: bulkActionMenuItems }} trigger={['click']}>
              <Button aria-label="Bulk actions menu">Bulk Actions</Button>
            </Dropdown>
            <Button onClick={() => setSelectedRowKeys([])} aria-label="Clear selection">
              Clear
            </Button>
          </Space>
        </div>
      )}

      {/* Enhanced Table with Column Toggle */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="Loading data..." />
        </div>
      ) : (
        <TableWithColumnToggle
          data={data}
          columns={columnConfigs}
          pageSize={pageSize}
          isLoading={loading}
          emptyMessage="No violations found"
          tableId="sod-violations" // For localStorage persistence
          showColumnPicker={true}
          className="module-data-grid-enhanced"
        />
      )}

      {/* Pagination Info */}
      <div
        style={{ marginTop: '16px', textAlign: 'right', color: '#666' }}
        role="status"
        aria-live="polite"
      >
        Showing {data.length} of {total} items (Page {page})
      </div>
    </div>
  );
};

export default ModuleDataGridEnhanced;
