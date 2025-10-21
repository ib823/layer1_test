'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Alert, Space, Skeleton, Empty } from 'antd';
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { DashboardConfig } from './types';

interface ModuleDashboardProps {
  config: DashboardConfig;
  moduleId: string;
}

export const ModuleDashboard: React.FC<ModuleDashboardProps> = ({ config, moduleId }) => {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Array<{ message: string; type: 'warning' | 'error' | 'info' }>>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage('Loading dashboard data...');

    try {
      // Fetch data from all KPI endpoints
      const promises = config.kpis.map(kpi =>
        fetch(kpi.endpoint).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const data: Record<string, number> = {};

      config.kpis.forEach((kpi, index) => {
        data[kpi.key] = results[index]?.value || 0;
      });

      setKpiData(data);
      setStatusMessage('Dashboard data loaded successfully');
    } catch (err) {
      setError('Failed to load dashboard data');
      setStatusMessage('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchKPIData();
  };

  if (error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <article style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
      {/* Screen reader status announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {/* KPI Cards */}
      <section aria-label="Key Performance Indicators">
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {config.kpis.map((kpi) => (
          <Col xs={24} sm={12} lg={6} key={kpi.key}>
            <Card bordered={false} style={{ background: '#fafafa' }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : (
                <Statistic
                  title={kpi.label}
                  value={kpiData[kpi.key] || 0}
                  prefix={kpi.icon}
                  valueStyle={{ color: kpi.color }}
                />
              )}
            </Card>
          </Col>
        ))}
      </Row>
      </section>

      {/* Issues Panel */}
      {issues.length > 0 && (
        <section aria-label="Action Items" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Action Items</h3>
          <Space direction="vertical" style={{ width: '100%' }}>
            {issues.map((issue, index) => (
              <Alert
                key={index}
                message={issue.message}
                type={issue.type}
                showIcon
                closable
              />
            ))}
          </Space>
        </section>
      )}

      {/* Quick Actions */}
      <section aria-label="Quick Actions">
      <Card title="Quick Actions" bordered={false}>
        <Space>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh Data
          </Button>
          <Button icon={<DownloadOutlined />}>
            Export Report
          </Button>
        </Space>
      </Card>
      </section>

      {/* Chart Placeholder */}
      {config.chartType && (
        <section aria-label="Trend Analysis" style={{ marginTop: '24px' }}>
        <Card title="Trend Analysis" bordered={false}>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty 
              description={`${config.chartType.toUpperCase()} chart will be rendered here`}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        </Card>
        </section>
      )}
    </article>
  );
};

export default ModuleDashboard;
