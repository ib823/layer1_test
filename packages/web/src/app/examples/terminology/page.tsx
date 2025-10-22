/**
 * ERP Terminology System - Example Page
 *
 * Demonstrates the ERP terminology system in action.
 */

'use client';

import { Card, Space, Divider, Table } from 'antd';
import { PageHead } from '@/components/seo/PageHead';
import {
  ERPProvider,
  ERPSelector,
  ERPTermTooltip,
  ERPTerm,
  ERPBadge,
  useERPContext,
} from '@/components/terminology';

function TerminologyDemo() {
  const { erpSystem } = useERPContext();

  const columns = [
    {
      title: 'Field',
      dataIndex: 'field',
      key: 'field',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: any) => {
        if (record.hasTerm) {
          return <ERPTerm erpSystem={erpSystem} term={text} />;
        }
        return text;
      },
    },
  ];

  const userData = [
    {
      key: '1',
      field: 'System',
      value: erpSystem,
      hasTerm: false,
    },
    {
      key: '2',
      field: 'User ID',
      value: 'JDOE',
      hasTerm: false,
    },
    {
      key: '3',
      field: erpSystem === 'SAP' ? 'Company Code' : erpSystem === 'Oracle' ? 'Operating Unit' : erpSystem === 'Dynamics' ? 'Legal Entity' : 'Subsidiary',
      value: erpSystem === 'SAP' ? 'Company Code' : erpSystem === 'Oracle' ? 'Operating Unit' : erpSystem === 'Dynamics' ? 'Legal Entity' : 'Subsidiary',
      hasTerm: true,
    },
    {
      key: '4',
      field: 'Department',
      value: erpSystem === 'SAP' ? 'Cost Center' : 'Department',
      hasTerm: erpSystem === 'SAP',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">ERP Terminology System</h1>
          <p className="text-gray-600">
            Hover over underlined terms to see explanations. Switch ERP systems to see how terminology adapts.
          </p>
        </div>
        <ERPBadge />
      </div>

      <div className="mb-6">
        <ERPSelector />
      </div>

      <Divider />

      <Space direction="vertical" size="large" className="w-full">
        <Card title="Example: User Access Review" bordered={false}>
          <p className="mb-4">
            When reviewing user access in{' '}
            <ERPTermTooltip erpSystem={erpSystem} term={erpSystem === 'SAP' ? 'Company Code' : erpSystem === 'Oracle' ? 'Operating Unit' : erpSystem === 'Dynamics' ? 'Legal Entity' : 'Subsidiary'} />
            , check that users have appropriate{' '}
            <ERPTermTooltip erpSystem={erpSystem} term={erpSystem === 'SAP' ? 'Authorization Object' : erpSystem === 'Oracle' ? 'Responsibility' : erpSystem === 'Dynamics' ? 'Security Role' : 'Role'} />
            {' '}assignments.
          </p>

          <Table columns={columns} dataSource={userData} pagination={false} size="small" />
        </Card>

        <Card title="Example: GL Entry Analysis" bordered={false}>
          <p className="mb-4">
            Analyzing{' '}
            <ERPTermTooltip erpSystem={erpSystem} term={erpSystem === 'SAP' ? 'GL Account' : erpSystem === 'Oracle' ? 'Ledger' : 'Main Account'} />
            {' '}entries from the{' '}
            <ERPTermTooltip erpSystem={erpSystem} term={erpSystem === 'SAP' ? 'Posting Period' : 'Accounting Period'} />
            {' '}shows unusual activity in{' '}
            <ERPTermTooltip erpSystem={erpSystem} term="Cost Center" />
            {' '}1000.
          </p>
        </Card>

        <Card title="Common ERP Terms" bordered={false}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {erpSystem === 'SAP' && (
              <>
                <div><ERPTerm erpSystem="SAP" term="Transaction Code" /></div>
                <div><ERPTerm erpSystem="SAP" term="Company Code" /></div>
                <div><ERPTerm erpSystem="SAP" term="GL Account" /></div>
                <div><ERPTerm erpSystem="SAP" term="Cost Center" /></div>
                <div><ERPTerm erpSystem="SAP" term="Business Partner" /></div>
                <div><ERPTerm erpSystem="SAP" term="OData Service" /></div>
              </>
            )}
            {erpSystem === 'Oracle' && (
              <>
                <div><ERPTerm erpSystem="Oracle" term="Responsibility" /></div>
                <div><ERPTerm erpSystem="Oracle" term="Ledger" /></div>
                <div><ERPTerm erpSystem="Oracle" term="Operating Unit" /></div>
                <div><ERPTerm erpSystem="Oracle" term="DFF" /></div>
                <div><ERPTerm erpSystem="Oracle" term="Journal Entry" /></div>
                <div><ERPTerm erpSystem="Oracle" term="Concurrent Program" /></div>
              </>
            )}
            {erpSystem === 'Dynamics' && (
              <>
                <div><ERPTerm erpSystem="Dynamics" term="Legal Entity" /></div>
                <div><ERPTerm erpSystem="Dynamics" term="Security Role" /></div>
                <div><ERPTerm erpSystem="Dynamics" term="Duty" /></div>
                <div><ERPTerm erpSystem="Dynamics" term="Privilege" /></div>
                <div><ERPTerm erpSystem="Dynamics" term="Main Account" /></div>
                <div><ERPTerm erpSystem="Dynamics" term="Financial Dimension" /></div>
              </>
            )}
            {erpSystem === 'NetSuite' && (
              <>
                <div><ERPTerm erpSystem="NetSuite" term="Role" /></div>
                <div><ERPTerm erpSystem="NetSuite" term="Subsidiary" /></div>
                <div><ERPTerm erpSystem="NetSuite" term="SuiteScript" /></div>
                <div><ERPTerm erpSystem="NetSuite" term="Saved Search" /></div>
                <div><ERPTerm erpSystem="NetSuite" term="SuiteQL" /></div>
                <div><ERPTerm erpSystem="NetSuite" term="Custom Record" /></div>
              </>
            )}
          </div>
        </Card>
      </Space>
    </div>
  );
}

export default function TerminologyExamplePage() {
  return (
    <>
      <PageHead
        title="ERP Terminology System"
        description="Demonstrates multi-ERP terminology system with tooltips, badges, and dynamic term translation"
      />
      <ERPProvider defaultSystem="SAP" multiERP={true}>
        <TerminologyDemo />
      </ERPProvider>
    </>
  );
}
