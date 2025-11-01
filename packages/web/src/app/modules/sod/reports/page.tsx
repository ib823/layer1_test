'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { ModuleReports } from '@/components/modules/ModuleReports';
import { PageHead } from '@/components/seo/PageHead';
import { sodConfig } from '../config';

export default function SoDReportsPage() {
  return (
    <>
      <PageHead
        title="SoD Reports"
        description="Generate and download SoD violation reports in multiple formats"
      />
      <ModuleTemplate config={sodConfig}>
        <ModuleReports config={sodConfig.reports} moduleId="sod" />
      </ModuleTemplate>
    </>
  );
}
