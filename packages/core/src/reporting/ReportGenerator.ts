/**
 * Report Generator Service
 *
 * Generates reports in PDF, DOCX, and Excel formats
 * Supports templating with Handlebars
 *
 * @module reporting/ReportGenerator
 */

import puppeteer from 'puppeteer';
import { HTMLToDocxOptions, convert as convertToDocx } from 'html-to-docx';
import ExcelJS from 'exceljs';
import Handlebars from 'handlebars';
import { PrismaClient } from '../generated/prisma';
import logger from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Report configuration
 */
export interface ReportConfig {
  title: string;
  description?: string;
  tenantId: string;
  tenantName: string;
  generatedBy: string;
  generatedAt: Date;
  type: ReportType;
  period?: {
    from: Date;
    to: Date;
  };
}

/**
 * Report types
 */
export enum ReportType {
  SOD_VIOLATIONS = 'sod_violations',
  GL_ANOMALY = 'gl_anomaly',
  INVOICE_MATCHING = 'invoice_matching',
  VENDOR_QUALITY = 'vendor_quality',
  COMPLIANCE_SUMMARY = 'compliance_summary',
  AUDIT_TRAIL = 'audit_trail',
  USER_ACCESS_REVIEW = 'user_access_review',
}

/**
 * Export format
 */
export enum ExportFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  EXCEL = 'excel',
  HTML = 'html',
}

/**
 * Report data structure
 */
export interface ReportData {
  config: ReportConfig;
  summary?: Record<string, any>;
  data: any[];
  charts?: ChartData[];
  metadata?: Record<string, any>;
}

/**
 * Chart data
 */
export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }[];
}

/**
 * ReportGenerator class
 * Singleton service for generating reports
 */
export class ReportGenerator {
  private static instance: ReportGenerator;
  private prisma: PrismaClient;
  private templateCache: Map<string, HandlebarsTemplateDelegate>;

  private constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.templateCache = new Map();
    this.registerHelpers();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(prisma?: PrismaClient): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator(prisma);
    }
    return ReportGenerator.instance;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Date formatting
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Number formatting
    Handlebars.registerHelper('formatNumber', (num: number) => {
      return num.toLocaleString('en-US');
    });

    // Currency formatting
    Handlebars.registerHelper('formatCurrency', (amount: number, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Percentage formatting
    Handlebars.registerHelper('formatPercent', (value: number) => {
      return `${(value * 100).toFixed(2)}%`;
    });

    // Conditional helpers
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
  }

  /**
   * Generate report in specified format
   */
  public async generateReport(
    reportData: ReportData,
    format: ExportFormat,
    outputPath?: string
  ): Promise<Buffer | string> {
    logger.info(`Generating ${format} report`, {
      type: reportData.config.type,
      tenantId: reportData.config.tenantId,
    });

    try {
      switch (format) {
        case ExportFormat.PDF:
          return await this.generatePDF(reportData, outputPath);
        case ExportFormat.DOCX:
          return await this.generateDOCX(reportData, outputPath);
        case ExportFormat.EXCEL:
          return await this.generateExcel(reportData, outputPath);
        case ExportFormat.HTML:
          return await this.generateHTML(reportData);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to generate report', { error, reportData });
      throw error;
    }
  }

  /**
   * Generate PDF report
   */
  private async generatePDF(reportData: ReportData, outputPath?: string): Promise<Buffer> {
    const html = await this.generateHTML(reportData);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html as string, { waitUntil: 'networkidle0' });

      const pdfData = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      const pdfBuffer = Buffer.from(pdfData);

      if (outputPath) {
        await fs.writeFile(outputPath, pdfBuffer);
        logger.info(`PDF report saved to ${outputPath}`);
      }

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate DOCX report
   */
  private async generateDOCX(reportData: ReportData, outputPath?: string): Promise<Buffer> {
    const html = await this.generateHTML(reportData);

    const docxOptions: HTMLToDocxOptions = {
      title: reportData.config.title,
      creator: reportData.config.generatedBy,
      description: reportData.config.description,
      margins: {
        top: 1440, // 1 inch = 1440 twips
        right: 1440,
        bottom: 1440,
        left: 1440,
      },
    };

    const docxBuffer = await convertToDocx(html as string, null, docxOptions);

    if (outputPath) {
      await fs.writeFile(outputPath, Buffer.from(docxBuffer));
      logger.info(`DOCX report saved to ${outputPath}`);
    }

    return Buffer.from(docxBuffer);
  }

  /**
   * Generate Excel report
   */
  private async generateExcel(reportData: ReportData, outputPath?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = reportData.config.generatedBy;
    workbook.created = reportData.config.generatedAt;
    workbook.title = reportData.config.title;

    // Add summary sheet
    if (reportData.summary) {
      const summarySheet = workbook.addWorksheet('Summary');
      this.addSummaryToSheet(summarySheet, reportData);
    }

    // Add data sheet
    const dataSheet = workbook.addWorksheet('Data');
    this.addDataToSheet(dataSheet, reportData);

    // Add charts sheet if charts exist
    if (reportData.charts && reportData.charts.length > 0) {
      const chartsSheet = workbook.addWorksheet('Charts');
      this.addChartsToSheet(chartsSheet, reportData.charts);
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    if (outputPath) {
      await fs.writeFile(outputPath, Buffer.from(buffer));
      logger.info(`Excel report saved to ${outputPath}`);
    }

    return Buffer.from(buffer);
  }

  /**
   * Generate HTML report
   */
  private async generateHTML(reportData: ReportData): Promise<string> {
    const templateName = this.getTemplateName(reportData.config.type);
    const template = await this.loadTemplate(templateName);

    const html = template({
      ...reportData,
      formatDate: (date: Date) => new Date(date).toLocaleDateString(),
      formatNumber: (num: number) => num.toLocaleString(),
    });

    return this.wrapWithLayout(html, reportData.config);
  }

  /**
   * Load template (with caching)
   */
  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);

    this.templateCache.set(templateName, template);
    return template;
  }

  /**
   * Get template name for report type
   */
  private getTemplateName(reportType: ReportType): string {
    const templateMap: Record<ReportType, string> = {
      [ReportType.SOD_VIOLATIONS]: 'sod-violations',
      [ReportType.GL_ANOMALY]: 'gl-anomaly',
      [ReportType.INVOICE_MATCHING]: 'invoice-matching',
      [ReportType.VENDOR_QUALITY]: 'vendor-quality',
      [ReportType.COMPLIANCE_SUMMARY]: 'compliance-summary',
      [ReportType.AUDIT_TRAIL]: 'audit-trail',
      [ReportType.USER_ACCESS_REVIEW]: 'user-access-review',
    };

    return templateMap[reportType] || 'default';
  }

  /**
   * Wrap HTML with layout
   */
  private wrapWithLayout(content: string, config: ReportConfig): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 3px solid #0066cc; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #0066cc; font-size: 24pt; margin-bottom: 10px; }
    .header .meta { color: #666; font-size: 9pt; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
    .summary h2 { font-size: 14pt; margin-bottom: 10px; color: #0066cc; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .summary-item { background: white; padding: 10px; border-radius: 3px; }
    .summary-item .label { font-weight: bold; color: #666; font-size: 9pt; text-transform: uppercase; }
    .summary-item .value { font-size: 18pt; color: #0066cc; font-weight: bold; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead { background: #0066cc; color: white; }
    th { padding: 10px; text-align: left; font-size: 10pt; font-weight: bold; }
    td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 10pt; }
    tbody tr:hover { background: #f5f5f5; }
    .footer { border-top: 2px solid #ddd; padding-top: 20px; margin-top: 40px; text-align: center; color: #666; font-size: 8pt; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 8pt; font-weight: bold; }
    .badge-critical { background: #dc3545; color: white; }
    .badge-high { background: #ff6b6b; color: white; }
    .badge-medium { background: #ffd93d; color: #333; }
    .badge-low { background: #95e1d3; color: #333; }
    .badge-success { background: #28a745; color: white; }
    .badge-warning { background: #ffc107; color: #333; }
    .badge-danger { background: #dc3545; color: white; }
    @media print {
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config.title}</h1>
      <div class="meta">
        <div><strong>Tenant:</strong> ${config.tenantName}</div>
        <div><strong>Generated:</strong> ${new Date(config.generatedAt).toLocaleString()}</div>
        <div><strong>Generated By:</strong> ${config.generatedBy}</div>
        ${config.period ? `<div><strong>Period:</strong> ${new Date(config.period.from).toLocaleDateString()} - ${new Date(config.period.to).toLocaleDateString()}</div>` : ''}
      </div>
    </div>

    ${content}

    <div class="footer">
      <p>This report was automatically generated by SAP GRC Framework</p>
      <p>Confidential - For authorized use only</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Add summary to Excel sheet
   */
  private addSummaryToSheet(sheet: ExcelJS.Worksheet, reportData: ReportData): void {
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' },
    };
    sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add summary data
    if (reportData.summary) {
      Object.entries(reportData.summary).forEach(([key, value]) => {
        sheet.addRow({ metric: key, value });
      });
    }
  }

  /**
   * Add data to Excel sheet
   */
  private addDataToSheet(sheet: ExcelJS.Worksheet, reportData: ReportData): void {
    if (!reportData.data || reportData.data.length === 0) {
      sheet.addRow({ message: 'No data available' });
      return;
    }

    // Get columns from first data item
    const firstItem = reportData.data[0];
    const columns = Object.keys(firstItem).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      key,
      width: 15,
    }));

    sheet.columns = columns;

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' },
    };
    sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data
    reportData.data.forEach((item) => {
      sheet.addRow(item);
    });

    // Add filters
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }

  /**
   * Add charts to Excel sheet
   */
  private addChartsToSheet(sheet: ExcelJS.Worksheet, charts: ChartData[]): void {
    let row = 1;

    charts.forEach((chartData) => {
      // Add chart title
      sheet.getCell(`A${row}`).value = chartData.title;
      sheet.getCell(`A${row}`).font = { bold: true, size: 14 };
      row += 2;

      // Add chart data as table
      const headerRow = sheet.getRow(row);
      headerRow.getCell(1).value = 'Label';
      chartData.datasets.forEach((dataset, i) => {
        headerRow.getCell(i + 2).value = dataset.label;
      });
      headerRow.font = { bold: true };
      row++;

      // Add data rows
      chartData.labels.forEach((label, i) => {
        const dataRow = sheet.getRow(row);
        dataRow.getCell(1).value = label;
        chartData.datasets.forEach((dataset, j) => {
          dataRow.getCell(j + 2).value = dataset.data[i];
        });
        row++;
      });

      row += 3; // Space between charts
    });
  }
}

/**
 * Export singleton instance
 */
export const reportGenerator = ReportGenerator.getInstance();
