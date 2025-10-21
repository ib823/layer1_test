'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Tabs, Descriptions, Tag, Badge, Timeline, Button, Space, Spin, Alert } from 'antd';
import { ArrowLeftOutlined, CloseOutlined } from '@ant-design/icons';
import { DetailViewConfig } from './types';

interface ModuleDetailViewProps {
  config: DetailViewConfig;
  recordId: string | null;
  open: boolean;
  onClose: () => void;
}

export const ModuleDetailView: React.FC<ModuleDetailViewProps> = ({ 
  config, 
  recordId, 
  open, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && recordId) {
      fetchData();
    }
  }, [open, recordId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = config.endpoint.replace(':id', recordId!);
      const response = await fetch(endpoint);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to load details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tabItems = config.sections.map(section => ({
    key: section.key,
    label: section.title,
    children: <section.component data={data} />,
  }));

  return (
    <Drawer
      title={
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onClose} />
          <span>Detail View</span>
        </Space>
      }
      width={720}
      open={open}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      extra={
        <Space>
          {config.secondaryActions?.map(action => (
            <Button key={action.label} onClick={() => action.onClick(recordId!)}>
              {action.label}
            </Button>
          ))}
          <Button
            type="primary"
            icon={config.primaryAction.icon}
            onClick={() => config.primaryAction.onClick(recordId!)}
          >
            {config.primaryAction.label}
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert message="Error" description={error} type="error" showIcon />
      ) : data ? (
        <>
          {/* Overview Card */}
          <div style={{ 
            padding: '16px', 
            background: '#fafafa', 
            borderRadius: '8px', 
            marginBottom: '24px' 
          }}>
            <Descriptions column={1}>
              <Descriptions.Item label="Status">
                <Tag color={data.status === 'OPEN' ? 'red' : 'green'}>
                  {data.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Risk Level">
                <Badge 
                  status={data.risk_level === 'HIGH' ? 'error' : 'warning'} 
                  text={data.risk_level} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="Detected">
                {new Date(data.detected_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </div>

          {/* Tabbed Sections */}
          <Tabs items={tabItems} />
        </>
      ) : null}
    </Drawer>
  );
};

export default ModuleDetailView;
