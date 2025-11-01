'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { ModuleDashboard } from '@/components/modules/ModuleDashboard';
import { PageHead } from '@/components/seo/PageHead';
import { sodConfig } from '../config';

export default function SoDDashboardPage() {
  return (
    <>
      <PageHead
        title="SoD Control Dashboard"
        description="Segregation of Duties analysis dashboard with violation tracking and risk assessment"
      />
      <ModuleTemplate config={sodConfig}>
        <ModuleDashboard config={sodConfig.dashboard} moduleId="sod" />
      </ModuleTemplate>
    </>
  );
}
