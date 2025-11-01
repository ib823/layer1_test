'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, Descriptions, Tag, Timeline, Badge } from 'antd';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { PageHead } from '@/components/seo/PageHead';
import { sodConfig } from '../config';

// Component implementations for detail sections
const ViolationOverview: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;

  return (
    <Card bordered={false}>
      <Descriptions column={2}>
        <Descriptions.Item label="User ID">{data.user_id}</Descriptions.Item>
        <Descriptions.Item label="User Name">{data.user_name}</Descriptions.Item>
        <Descriptions.Item label="Business Process">{data.business_process}</Descriptions.Item>
        <Descriptions.Item label="Risk Level">
          <Badge 
            status={data.risk_level === 'HIGH' ? 'error' : 'warning'} 
            text={data.risk_level} 
          />
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={data.status === 'OPEN' ? 'red' : 'green'}>
            {data.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Detected At">
          {new Date(data.detected_at).toLocaleString()}
        </Descriptions.Item>
      </Descriptions>
      
      {data.mitigation_notes && (
        <div style={{ marginTop: '16px' }}>
          <strong>Mitigation Notes:</strong>
          <p>{data.mitigation_notes}</p>
        </div>
      )}
    </Card>
  );
};

const RoleAnalysis: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;

  return (
    <Card bordered={false}>
      <h4>Conflicting Roles</h4>
      {data.conflicting_roles?.map((role: string, index: number) => (
        <Tag key={index} color="red" style={{ marginBottom: '8px' }}>
          {role}
        </Tag>
      ))}
      
      <h4 style={{ marginTop: '24px' }}>Conflicting Transactions</h4>
      {data.conflicting_transactions?.map((txn: string, index: number) => (
        <Tag key={index} color="orange" style={{ marginBottom: '8px' }}>
          {txn}
        </Tag>
      ))}
    </Card>
  );
};

const ViolationHistory: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;

  const historyItems = [
    {
      children: `Violation detected at ${new Date(data.detected_at).toLocaleString()}`,
      color: 'red',
    },
  ];

  if (data.reviewed_at) {
    historyItems.push({
      children: `Reviewed by ${data.reviewer} at ${new Date(data.reviewed_at).toLocaleString()}`,
      color: 'blue',
    });
  }

  return (
    <Card bordered={false}>
      <Timeline items={historyItems} />
    </Card>
  );
};

export default function SoDDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // Update the config with the actual components
  const detailConfigWithComponents = {
    ...sodConfig.detailView,
    sections: [
      { key: 'overview', title: 'Violation Details', component: ViolationOverview },
      { key: 'roles', title: 'Role Analysis', component: RoleAnalysis },
      { key: 'history', title: 'History', component: ViolationHistory },
    ],
  };

  return (
    <>
      <PageHead
        title={`SoD Violation ${id}`}
        description="Detailed analysis of Segregation of Duties violation with role conflicts and remediation history"
      />
      <ModuleTemplate config={sodConfig}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <h2>Violation Details: {id}</h2>
          {/* Detail view will be rendered here */}
          <p>Detail view implementation using ModuleDetailView component</p>
        </div>
      </ModuleTemplate>
    </>
  );
}
