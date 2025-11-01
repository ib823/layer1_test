'use client';

/**
 * Logo Showcase Page
 *
 * Demonstrates the Logo component in different variants and sizes
 * Used for UI/UX testing across responsive breakpoints
 */

import React from 'react';
import { Card, Space, Typography, Divider } from 'antd';
import { Logo } from '@/components/branding/Logo';

const { Title, Paragraph } = Typography;

export default function LogoShowcase() {
  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={1}>Logo Component Showcase</Title>
      <Paragraph>
        This page demonstrates the Logo component across different variants and sizes.
        Test responsiveness by resizing your browser window.
      </Paragraph>

      {/* Variants Section */}
      <Divider />
      <Title level={2}>Logo Variants</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="Mark Variant (Icon Only)">
          <Space wrap>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Logo variant="mark" size="small" />
              <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>Small (32px)</Paragraph>
            </div>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Logo variant="mark" size="medium" />
              <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>Medium (48px)</Paragraph>
            </div>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Logo variant="mark" size="large" />
              <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>Large (64px)</Paragraph>
            </div>
          </Space>
        </Card>

        <Card title="Full Variant">
          <Space wrap>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Logo variant="full" size="small" />
              <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>Small</Paragraph>
            </div>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Logo variant="full" size="medium" />
              <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>Medium</Paragraph>
            </div>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Logo variant="full" size="large" />
              <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>Large</Paragraph>
            </div>
          </Space>
        </Card>

        <Card title="Horizontal Variant">
          <Space wrap direction="vertical">
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', minWidth: '300px' }}>
              <Logo variant="horizontal" size="small" />
              <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>Small</Paragraph>
            </div>
            <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', minWidth: '300px' }}>
              <Logo variant="horizontal" size="medium" />
              <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>Medium</Paragraph>
            </div>
          </Space>
        </Card>
      </Space>

      {/* Interactive Section */}
      <Divider />
      <Title level={2}>Interactive Variants</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="Clickable Logo (Links to Dashboard)">
          <Logo variant="mark" size="medium" href="/dashboard" />
        </Card>

        <Card title="Dark Background Test">
          <div style={{ padding: '20px', background: '#0C2B87', borderRadius: '8px', display: 'inline-block' }}>
            <Logo variant="mark" size="medium" />
          </div>
        </Card>
      </Space>

      {/* Responsive Grid */}
      <Divider />
      <Title level={2}>Responsive Grid</Title>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          width: '100%',
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} style={{ textAlign: 'center' }}>
            <Logo variant="mark" size="medium" />
            <Paragraph style={{ marginTop: '10px', fontSize: '12px' }}>
              Grid Item {i}
            </Paragraph>
          </Card>
        ))}
      </div>

      {/* Mobile View Simulation */}
      <Divider />
      <Title level={2}>Mobile View (320px)</Title>
      <div
        style={{
          width: '320px',
          padding: '20px',
          background: '#f5f5f5',
          borderRadius: '8px',
          margin: 'auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Logo variant="mark" size="small" />
        </div>
        <Paragraph style={{ fontSize: '14px' }}>
          On mobile devices, the logo is small and centered in the header.
        </Paragraph>
      </div>

      {/* Tablet View Simulation */}
      <Divider />
      <Title level={2}>Tablet View (768px)</Title>
      <div
        style={{
          width: '768px',
          maxWidth: '100%',
          padding: '20px',
          background: '#f5f5f5',
          borderRadius: '8px',
          margin: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <Logo variant="mark" size="small" />
          <span>Prism</span>
        </div>
        <Paragraph style={{ fontSize: '14px' }}>
          On tablet devices, the logo is paired with text branding.
        </Paragraph>
      </div>
    </div>
  );
}
