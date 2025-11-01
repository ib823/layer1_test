'use client';

import React, { useState } from 'react';
import { Input, Card, Typography, Divider, Space, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { PageHead } from '@/components/seo/PageHead';

const { Title, Paragraph, Text } = Typography;

interface GlossaryTerm {
  term: string;
  fullTerm?: string;
  definition: string;
  example?: string;
  category: 'sod' | 'lhdn' | 'gl' | 'invoice' | 'vendor' | 'sap' | 'general';
}

const glossaryTerms: GlossaryTerm[] = [
  // SoD Terms
  {
    term: 'SoD',
    fullTerm: 'Segregation of Duties',
    definition: 'A security principle that prevents any single person from having complete control over a critical business process. It requires that multiple people be involved in completing a sensitive task.',
    example: 'The person who approves payments should not also be able to create invoices.',
    category: 'sod',
  },
  {
    term: 'Critical Access',
    definition: 'SAP transactions or authorizations that allow users to perform sensitive operations, such as posting financial transactions, changing master data, or accessing confidential information.',
    example: 'Transaction code FB60 (Enter Incoming Invoices) is considered critical access.',
    category: 'sod',
  },
  {
    term: 'Role Mining',
    definition: 'The process of analyzing user access patterns to identify logical groupings of permissions that can be assigned as roles.',
    example: 'Analyzing which transactions are commonly used together by Accounts Payable clerks.',
    category: 'sod',
  },
  {
    term: 'Risk Level',
    definition: 'A classification indicating the severity of a compliance issue. Typically categorized as Critical, High, Medium, or Low.',
    example: 'A user having both invoice creation and payment approval access is a Critical risk.',
    category: 'general',
  },
  {
    term: 'Compensating Control',
    definition: 'An alternative security measure implemented when the primary control cannot be fully achieved, designed to reduce risk to an acceptable level.',
    example: 'When a user must have conflicting roles, requiring manager review of all transactions acts as a compensating control.',
    category: 'sod',
  },

  // LHDN Terms
  {
    term: 'LHDN',
    fullTerm: 'Lembaga Hasil Dalam Negeri',
    definition: 'The Inland Revenue Board of Malaysia, the government agency responsible for tax collection and enforcement.',
    category: 'lhdn',
  },
  {
    term: 'MyInvois',
    definition: 'Malaysia\'s national e-invoicing system mandated by LHDN for B2B, B2C, and B2G transactions. All invoices must be submitted and validated through this platform.',
    example: 'Starting January 2025, all businesses must submit invoices to MyInvois for validation.',
    category: 'lhdn',
  },
  {
    term: 'E-Invoice',
    definition: 'An electronic invoice transmitted and received in a structured digital format that allows for automatic and electronic processing.',
    example: 'An XML or JSON invoice submitted to MyInvois for validation.',
    category: 'lhdn',
  },
  {
    term: 'Validation Status',
    definition: 'The approval state of an e-invoice in the MyInvois system. Can be Valid, Invalid, Rejected, or Cancelled.',
    category: 'lhdn',
  },
  {
    term: 'Credit Note',
    definition: 'A document issued by a seller to a buyer to correct or cancel a previously issued invoice, typically due to returned goods or billing errors.',
    example: 'Issuing a credit note after a customer returns defective products.',
    category: 'lhdn',
  },
  {
    term: 'Debit Note',
    definition: 'A document issued by a buyer to a seller indicating a debt, or by a seller to correct an undercharged invoice.',
    example: 'Issuing a debit note when additional charges were discovered after the original invoice.',
    category: 'lhdn',
  },

  // GL & Accounting Terms
  {
    term: 'GL Account',
    fullTerm: 'General Ledger Account',
    definition: 'A unique account in the general ledger used to record and classify financial transactions by type (assets, liabilities, equity, revenue, expenses).',
    example: 'Account 1000 might represent Cash in Bank.',
    category: 'gl',
  },
  {
    term: 'Benford\'s Law',
    definition: 'A mathematical principle stating that in naturally occurring datasets, the first digit is more likely to be small (1-2) than large (8-9). Used to detect fraudulent data.',
    example: 'In legitimate expense reports, about 30% of transactions should start with "1", but fabricated data often shows equal distribution.',
    category: 'gl',
  },
  {
    term: 'Anomaly Detection',
    definition: 'The process of identifying unusual patterns or outliers in data that may indicate errors, fraud, or compliance issues.',
    example: 'Detecting a $1,000,000 transaction in a typically $5,000 account.',
    category: 'gl',
  },
  {
    term: 'Posting Period',
    definition: 'A time frame (typically a month) during which financial transactions are recorded in the general ledger.',
    example: 'Fiscal Period 001 represents January.',
    category: 'gl',
  },
  {
    term: 'Statistical Outlier',
    definition: 'A data point that differs significantly from other observations, typically identified using standard deviation thresholds.',
    example: 'A transaction 3 standard deviations above the mean for that account.',
    category: 'gl',
  },

  // Invoice Matching Terms
  {
    term: 'Three-Way Match',
    definition: 'A verification process comparing three documents—Purchase Order (PO), Goods Receipt (GR), and Invoice—to ensure accuracy before payment.',
    example: 'Verifying that the invoice quantity matches both the PO and what was actually received.',
    category: 'invoice',
  },
  {
    term: 'PO',
    fullTerm: 'Purchase Order',
    definition: 'A commercial document issued by a buyer to a seller, indicating types, quantities, and agreed prices for products or services.',
    category: 'invoice',
  },
  {
    term: 'GR',
    fullTerm: 'Goods Receipt',
    definition: 'A document confirming that ordered goods have been received, serving as proof of delivery.',
    example: 'A warehouse manager creates a GR after physically receiving a shipment.',
    category: 'invoice',
  },
  {
    term: 'Discrepancy',
    definition: 'A mismatch between expected and actual values in documents being compared, such as quantity or price differences.',
    example: 'The invoice shows 100 units but the GR confirms only 95 units were received.',
    category: 'invoice',
  },
  {
    term: 'Match Status',
    definition: 'The result of comparing invoice documents. Can be Matched (all documents align), Partial (some discrepancies), or Unmatched (significant issues).',
    category: 'invoice',
  },

  // Vendor Terms
  {
    term: 'Vendor Master Data',
    definition: 'Centralized information about suppliers, including name, address, bank details, payment terms, and business registration information.',
    example: 'Maintaining accurate tax IDs and bank accounts for all suppliers.',
    category: 'vendor',
  },
  {
    term: 'Data Quality Score',
    definition: 'A metric indicating the completeness, accuracy, and consistency of vendor master data records.',
    example: 'A vendor with missing tax ID and outdated address might have a 60% quality score.',
    category: 'vendor',
  },
  {
    term: 'Duplicate Vendor',
    definition: 'Multiple vendor records in the system that represent the same supplier, often caused by data entry errors or variations in naming.',
    example: 'ABC Company Ltd. and ABC Company Limited entered as two separate vendors.',
    category: 'vendor',
  },

  // SAP Terms
  {
    term: 'T-Code',
    fullTerm: 'Transaction Code',
    definition: 'A shortcut command in SAP that directly opens a specific function or screen, bypassing menu navigation.',
    example: 'T-Code MM03 displays material master data.',
    category: 'sap',
  },
  {
    term: 'Authorization Object',
    definition: 'An SAP security component that controls access to specific functions or data. Contains fields that define what actions can be performed.',
    example: 'Authorization object F_BKPF_BUK controls which company codes a user can post to.',
    category: 'sap',
  },
  {
    term: 'Role',
    definition: 'A collection of authorizations (permissions) assigned to users that determine which SAP functions they can access.',
    example: 'Role Z_AP_CLERK might include authorizations for entering invoices and viewing vendor data.',
    category: 'sap',
  },
  {
    term: 'SAP S/4HANA',
    definition: 'SAP\'s next-generation ERP system built on the HANA in-memory database platform, designed for real-time business processes.',
    category: 'sap',
  },
  {
    term: 'OData',
    definition: 'Open Data Protocol, a REST-based protocol for querying and updating data, used by SAP Gateway for API integrations.',
    example: 'Fetching invoice data from SAP using OData service /sap/opu/odata/sap/API_INVOICE',
    category: 'sap',
  },

  // General Compliance Terms
  {
    term: 'GRC',
    fullTerm: 'Governance, Risk, and Compliance',
    definition: 'An integrated approach to managing an organization\'s governance structure, risk management processes, and compliance with regulations.',
    category: 'general',
  },
  {
    term: 'Audit Trail',
    definition: 'A chronological record of system activities providing documentary evidence of operations, procedures, or events.',
    example: 'Recording who created, modified, or approved each invoice.',
    category: 'general',
  },
  {
    term: 'User Access Review',
    definition: 'A periodic process of examining user permissions to ensure users have only the access required for their current job responsibilities.',
    example: 'Quarterly review of all users with payment approval access.',
    category: 'general',
  },
  {
    term: 'Workflow',
    definition: 'A defined sequence of tasks or processes that must be completed to accomplish a business objective.',
    example: 'An invoice approval workflow: Create → Review → Manager Approval → Payment.',
    category: 'general',
  },
  {
    term: 'WCAG',
    fullTerm: 'Web Content Accessibility Guidelines',
    definition: 'International standards for making web content accessible to people with disabilities, including visual, auditory, physical, and cognitive impairments.',
    example: 'WCAG 2.1 Level AA requires a 4.5:1 color contrast ratio for normal text.',
    category: 'general',
  },
];

const categoryLabels: Record<GlossaryTerm['category'], { label: string; color: string }> = {
  sod: { label: 'SoD', color: 'blue' },
  lhdn: { label: 'LHDN', color: 'green' },
  gl: { label: 'GL', color: 'purple' },
  invoice: { label: 'Invoice', color: 'orange' },
  vendor: { label: 'Vendor', color: 'cyan' },
  sap: { label: 'SAP', color: 'red' },
  general: { label: 'General', color: 'default' },
};

export default function GlossaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTerms = glossaryTerms.filter((term) => {
    const matchesSearch =
      term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.fullTerm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || term.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group terms by first letter
  const groupedTerms = filteredTerms.reduce((acc, term) => {
    const firstLetter = term.term[0].toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(term);
    return acc;
  }, {} as Record<string, GlossaryTerm[]>);

  return (
    <>
      <PageHead
        title="Glossary"
        description="GRC and SAP terminology reference for ABeam CoreBridge"
      />
      <main id="main-content" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '32px' }}>
          <Title level={1}>Glossary</Title>
          <Paragraph style={{ fontSize: '16px', color: '#666' }}>
            A comprehensive reference of GRC, SAP, and compliance terminology used throughout the platform.
          </Paragraph>
        </header>

        {/* Search and Filters */}
        <Card style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Input
              placeholder="Search terms..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="large"
              allowClear
              aria-label="Search glossary terms"
            />

            <div>
              <Text strong style={{ marginRight: '12px' }}>
                Filter by category:
              </Text>
              <Space wrap>
                <Tag
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  color={!selectedCategory ? 'blue' : 'default'}
                  onClick={() => setSelectedCategory(null)}
                >
                  All ({glossaryTerms.length})
                </Tag>
                {Object.entries(categoryLabels).map(([key, { label, color }]) => {
                  const count = glossaryTerms.filter((t) => t.category === key).length;
                  return (
                    <Tag
                      key={key}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      color={selectedCategory === key ? color : 'default'}
                      onClick={() => setSelectedCategory(key)}
                    >
                      {label} ({count})
                    </Tag>
                  );
                })}
              </Space>
            </div>
          </Space>
        </Card>

        {/* Terms List */}
        {filteredTerms.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                No terms found matching your search.
              </Text>
            </div>
          </Card>
        ) : (
          Object.keys(groupedTerms)
            .sort()
            .map((letter) => (
              <div key={letter} id={`letter-${letter}`} style={{ marginBottom: '32px' }}>
                <Title level={2} style={{ fontSize: '24px', marginBottom: '16px', color: '#1890ff' }}>
                  {letter}
                </Title>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {groupedTerms[letter]
                    .sort((a, b) => a.term.localeCompare(b.term))
                    .map((term, index) => (
                      <Card key={`${term.term}-${index}`} id={term.term.toLowerCase().replace(/\s+/g, '-')}>
                        <div>
                          <div style={{ marginBottom: '8px' }}>
                            <Text strong style={{ fontSize: '18px', color: '#262626' }}>
                              {term.term}
                            </Text>
                            {term.fullTerm && (
                              <Text type="secondary" style={{ fontSize: '14px', marginLeft: '8px' }}>
                                ({term.fullTerm})
                              </Text>
                            )}
                            <Tag
                              color={categoryLabels[term.category].color}
                              style={{ marginLeft: '12px', fontSize: '12px' }}
                            >
                              {categoryLabels[term.category].label}
                            </Tag>
                          </div>
                          <Paragraph style={{ fontSize: '15px', marginBottom: term.example ? '8px' : '0' }}>
                            {term.definition}
                          </Paragraph>
                          {term.example && (
                            <Paragraph style={{ fontSize: '14px', fontStyle: 'italic', color: '#8c8c8c', marginBottom: '0' }}>
                              <strong>Example:</strong> {term.example}
                            </Paragraph>
                          )}
                        </div>
                      </Card>
                    ))}
                </Space>
              </div>
            ))
        )}

        {/* Footer Note */}
        <Divider />
        <footer style={{ textAlign: 'center', padding: '24px' }}>
          <Text type="secondary">
            Can't find a term? Contact your system administrator for assistance.
          </Text>
        </footer>
      </main>
    </>
  );
}
