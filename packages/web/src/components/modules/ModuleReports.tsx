'use client';

import React, { useState } from 'react';
import { Card, Row, Col, DatePicker, Button, Space, Table, Empty, Modal, App } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, DownloadOutlined, CalendarOutlined } from '@ant-design/icons';
import { ReportsConfig } from './types';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface ModuleReportsProps {
  config: ReportsConfig;
  moduleId: string;
}

export const ModuleReports: React.FC<ModuleReportsProps> = ({ config, moduleId }) => {
  const { message } = App.useApp();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const handleGenerateReport = async () => {
    if (!selectedTemplate || !dateRange) {
      message.warning('Please select a report template and date range');
      return;
    }

    setLoading(true);
    try {
      const template = config.templates.find(t => t.key === selectedTemplate);
      if (!template) return;

      const response = await fetch(
        `${template.endpoint}?from=${dateRange[0].toISOString()}&to=${dateRange[1].toISOString()}`
      );
      const data = await response.json();
      setReportData(data);
      message.success('Report generated successfully');
    } catch (error) {
      message.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'csv' | 'excel') => {
    message.info(`Exporting as ${format.toUpperCase()}...`);
    // Implementation for export
  };

  const handleScheduleEmail = () => {
    setScheduleModalOpen(true);
  };

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
      <Row gutter={[24, 24]}>
        {/* Report Templates */}
        <Col span={24}>
          <h3 style={{ marginBottom: '16px' }}>Select Report Template</h3>
          <Row gutter={[16, 16]}>
            {config.templates.map(template => (
              <Col xs={24} sm={12} lg={6} key={template.key}>
                <Card
                  hoverable
                  onClick={() => setSelectedTemplate(template.key)}
                  style={{
                    borderColor: selectedTemplate === template.key ? '#1890ff' : undefined,
                    borderWidth: selectedTemplate === template.key ? 2 : 1,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                      {template.icon}
                    </div>
                    <h4>{template.title}</h4>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {template.description}
                    </p>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        {/* Date Range and Actions */}
        <Col span={24}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Date Range
                </label>
                <RangePicker
                  style={{ width: '100%', maxWidth: '400px' }}
                  onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs])}
                />
              </div>
              
              <Space>
                <Button
                  type="primary"
                  onClick={handleGenerateReport}
                  loading={loading}
                  disabled={!selectedTemplate || !dateRange}
                >
                  Generate Report
                </Button>
                <Button
                  icon={<CalendarOutlined />}
                  onClick={handleScheduleEmail}
                  disabled={!selectedTemplate}
                >
                  Schedule Email
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Preview Area */}
        <Col span={24}>
          <Card title="Report Preview">
            {reportData.length > 0 ? (
              <>
                <Space style={{ marginBottom: '16px' }}>
                  <Button icon={<FilePdfOutlined />} onClick={() => handleExport('pdf')}>
                    Export PDF
                  </Button>
                  <Button icon={<FileExcelOutlined />} onClick={() => handleExport('excel')}>
                    Export Excel
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>
                    Export CSV
                  </Button>
                </Space>
                <Table
                  dataSource={reportData}
                  columns={[
                    { title: 'ID', dataIndex: 'id', key: 'id' },
                    { title: 'Value', dataIndex: 'value', key: 'value' },
                    { title: 'Date', dataIndex: 'date', key: 'date' },
                  ]}
                  pagination={{ pageSize: 10 }}
                />
              </>
            ) : (
              <Empty description="Generate a report to see the preview" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Schedule Modal */}
      <Modal
        title="Schedule Report Email"
        open={scheduleModalOpen}
        onCancel={() => setScheduleModalOpen(false)}
        onOk={() => {
          message.success('Report scheduled successfully');
          setScheduleModalOpen(false);
        }}
      >
        <p>Schedule configuration will be implemented here</p>
      </Modal>
    </div>
  );
};

export default ModuleReports;
