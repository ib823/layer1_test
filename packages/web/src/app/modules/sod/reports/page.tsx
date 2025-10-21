'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { ModuleReports } from '@/components/modules/ModuleReports';
import { sodConfig } from '../config';

export default function SoDReportsPage() {
  return (
    <ModuleTemplate config={sodConfig}>
      <ModuleReports config={sodConfig.reports} moduleId="sod" />
    </ModuleTemplate>
  );
}
