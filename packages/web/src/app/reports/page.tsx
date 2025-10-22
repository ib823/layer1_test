'use client';

/**
 * Reports Page
 *
 * Generate and download compliance and operational reports
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  DatePicker,
  Button,
  Form,
  Typography,
  Space,
  Radio,
  message,
  Spin,
  List,
  Tag,
  Divider,
  Row,
  Col,
} from 'antd';
import { PageHead } from '@/components/seo/PageHead';
import {
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// Report types
const REPORT_TYPES = [
  {
    value: 'sod_violations',
    label: 'SoD Violations Report',
    description: 'Comprehensive analysis of segregation of duties conflicts',
    icon: '⚠️',
  },
  {
    value: 'gl_anomaly',
    label: 'GL Anomaly Detection',
    description: 'Detection and analysis of unusual GL transactions',
    icon: '🔍',
  },
  {
    value: 'invoice_matching',
    label: 'Invoice Matching',
    description: 'Invoice-to-PO matching results and discrepancies',
    icon: '📋',
  },
  {
    value: 'vendor_quality',
    label: 'Vendor Data Quality',
    description: 'Vendor master data quality assessment',
    icon: '🏢',
  },
  {
    value: 'compliance_summary',
    label: 'Compliance Summary',
    description: 'Overall compliance status and findings',
    icon: '✅',
  },
  {
    value: 'audit_trail',
    label: 'Audit Trail',
    description: 'Complete audit trail of system activities',
    icon: '📜',
  },
  {
    value: 'user_access_review',
    label: 'User Access Review',
    description: 'User access rights and permissions review',
    icon: '👥',
  },
];

// Export formats
const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: <FilePdfOutlined /> },
  { value: 'docx', label: 'Word (DOCX)', icon: <FileWordOutlined /> },
  { value: 'excel', label: 'Excel', icon: <FileExcelOutlined /> },
  { value: 'html', label: 'HTML', icon: <FileTextOutlined /> },
];

export default function ReportsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);

  useEffect(() => {
    loadScheduledReports();
  }, []);

  const loadScheduledReports = async () => {
    try {
      // TODO: Fetch from API
      setScheduledReports([]);
    } catch (error) {
      console.error('Failed to load scheduled reports', error);
    }
  };

  const handleGenerateReport = async (values: any) => {
    setLoading(true);
    try {
      const { reportType, format, dateRange, includeCharts } = values;

      const payload: any = {
        reportType,
        format,
        includeCharts: includeCharts !== false,
      };

      if (dateRange) {
        payload.period = {
          from: dateRange[0].toISOString(),
          to: dateRange[1].toISOString(),
        };
      }

      message.loading({ content: 'Generating report...', key: 'report' });

      // Call API
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      message.success({ content: 'Report generated successfully!', key: 'report' });
    } catch (error) {
      console.error('Failed to generate report', error);
      message.error({ content: 'Failed to generate report', key: 'report' });
    } finally {
      setLoading(false);
    }
  };

  const getReportInfo = (type: string) => {
    return REPORT_TYPES.find((r) => r.value === type);
  };

  return (
    <>
      <PageHead
        title="Reports"
        description="Generate comprehensive reports in multiple formats (PDF, Word, Excel) for compliance and audit analysis"
      />
      <div style={{ padding: '24px' }}>
        <Title level={2}>Reports</Title>
      <Paragraph>
        Generate comprehensive reports in multiple formats (PDF, Word, Excel) for compliance,
        audit, and operational analysis.
      </Paragraph>

      <Row gutter={24}>
        <Col span={14}>
          {/* Report Generation Form */}
          <Card title="Generate Report" style={{ marginBottom: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleGenerateReport}
              initialValues={{
                format: 'pdf',
                includeCharts: true,
              }}
            >
              <Form.Item
                name="reportType"
                label="Report Type"
                rules={[{ required: true, message: 'Please select a report type' }]}
              >
                <Select
                  placeholder="Select report type"
                  onChange={setSelectedReportType}
                  size="large"
                >
                  {REPORT_TYPES.map((report) => (
                    <Select.Option key={report.value} value={report.value}>
                      <Space>
                        <span>{report.icon}</span>
                        <span>
                          <strong>{report.label}</strong>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {report.description}
                          </div>
                        </span>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedReportType && (
                <div
                  style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                  }}
                >
                  <strong>{getReportInfo(selectedReportType)?.icon} {getReportInfo(selectedReportType)?.label}</strong>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {getReportInfo(selectedReportType)?.description}
                  </div>
                </div>
              )}

              <Form.Item
                name="format"
                label="Export Format"
                rules={[{ required: true, message: 'Please select an export format' }]}
              >
                <Radio.Group buttonStyle="solid" size="large">
                  {EXPORT_FORMATS.map((format) => (
                    <Radio.Button key={format.value} value={format.value}>
                      <Space>
                        {format.icon}
                        {format.label}
                      </Space>
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              <Form.Item name="dateRange" label="Date Range (Optional)">
                <RangePicker
                  style={{ width: '100%' }}
                  size="large"
                  format="YYYY-MM-DD"
                  presets={[
                    { label: 'Last 7 Days', value: [dayjs().subtract(7, 'd'), dayjs()] },
                    { label: 'Last 30 Days', value: [dayjs().subtract(30, 'd'), dayjs()] },
                    { label: 'Last 90 Days', value: [dayjs().subtract(90, 'd'), dayjs()] },
                    { label: 'This Month', value: [dayjs().startOf('month'), dayjs()] },
                    { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                  ]}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<DownloadOutlined />}
                  size="large"
                  loading={loading}
                  block
                >
                  Generate & Download Report
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={10}>
          {/* Quick Actions */}
          <Card title="Quick Actions" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => {
                  form.setFieldsValue({
                    reportType: 'compliance_summary',
                    format: 'pdf',
                  });
                  setSelectedReportType('compliance_summary');
                }}
                block
              >
                Compliance Summary (PDF)
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => {
                  form.setFieldsValue({
                    reportType: 'sod_violations',
                    format: 'excel',
                  });
                  setSelectedReportType('sod_violations');
                }}
                block
              >
                SoD Violations (Excel)
              </Button>
              <Button
                icon={<FileWordOutlined />}
                onClick={() => {
                  form.setFieldsValue({
                    reportType: 'audit_trail',
                    format: 'docx',
                  });
                  setSelectedReportType('audit_trail');
                }}
                block
              >
                Audit Trail (Word)
              </Button>
            </Space>
          </Card>

          {/* Report Info */}
          <Card title="Report Features">
            <List
              size="small"
              dataSource={[
                'Professional formatting with header/footer',
                'Automatic data aggregation and statistics',
                'Charts and visualizations (Excel)',
                'Compliance-ready documentation',
                'PII masking for sensitive data',
                'Customizable date ranges and filters',
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <span style={{ color: '#52c41a' }}>✓</span>
                    <span>{item}</span>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Scheduled Reports */}
      {scheduledReports.length > 0 && (
        <Card title={<><ClockCircleOutlined /> Scheduled Reports</>} style={{ marginTop: 24 }}>
          <List
            dataSource={scheduledReports}
            renderItem={(report: any) => (
              <List.Item
                actions={[
                  <Button type="link" key="edit">
                    Edit
                  </Button>,
                  <Button type="link" danger key="delete">
                    Delete
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={report.reportType}
                  description={
                    <Space>
                      <Tag>{report.format.toUpperCase()}</Tag>
                      <Tag>{report.schedule}</Tag>
                      <span>Recipients: {report.recipients.length}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
      </div>
    </>
  );
}
