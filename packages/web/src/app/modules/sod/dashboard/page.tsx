'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { ModuleDashboard } from '@/components/modules/ModuleDashboard';
import { sodConfig } from '../config';

export default function SoDDashboardPage() {
  return (
    <ModuleTemplate config={sodConfig}>
      <ModuleDashboard config={sodConfig.dashboard} moduleId="sod" />
    </ModuleTemplate>
  );
}
