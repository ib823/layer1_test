'use client';

import React, { useState, useEffect } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, Dropdown, App, Tag } from 'antd';
import type { TableProps, MenuProps } from 'antd';
import { SearchOutlined, FilterOutlined, ExportOutlined, MoreOutlined } from '@ant-design/icons';
import { DataGridConfig } from './types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface ModuleDataGridProps {
  config: DataGridConfig;
}

export const ModuleDataGrid: React.FC<ModuleDataGridProps> = ({ config }) => {
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

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const bulkActionMenuItems: MenuProps['items'] = config.bulkActions?.map(action => ({
    key: action.key,
    label: action.label,
    onClick: () => {
      action.onClick(selectedRowKeys as string[]);
      setSelectedRowKeys([]);
    },
  })) || [];

  const columns = config.columns.map(col => ({
    ...col,
    dataIndex: col.dataIndex,
    sorter: col.sorter,
    filters: col.filters,
  }));

  // Add action column
  columns.push({
    title: 'Actions',
    key: 'actions',
    dataIndex: '',
    fixed: 'right' as const,
    width: 100,
    render: (_: any, record: any) => {
      const menuItems: MenuProps['items'] = config.actions.map(action => ({
        key: action.key,
        label: action.label,
        icon: action.icon,
        danger: action.danger,
        onClick: () => action.onClick(record),
      }));

      return (
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      );
    },
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
        <Button icon={<ExportOutlined />} onClick={handleExport}>
          Export
        </Button>
      </Space>

      {/* Bulk Actions */}
      {selectedRowKeys.length > 0 && config.bulkActions && (
        <div style={{ marginBottom: '16px', padding: '8px', background: '#e6f7ff', borderRadius: '4px' }}>
          <Space>
            <span>{selectedRowKeys.length} selected</span>
            <Dropdown menu={{ items: bulkActionMenuItems }} trigger={['click']}>
              <Button>Bulk Actions</Button>
            </Dropdown>
            <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
          </Space>
        </div>
      )}

      {/* Table */}
      <Table
        rowSelection={config.bulkActions ? rowSelection : undefined}
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} items`,
          onChange: (newPage) => setPage(newPage),
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default ModuleDataGrid;
