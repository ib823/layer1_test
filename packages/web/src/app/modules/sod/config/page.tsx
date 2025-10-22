'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { ModuleConfig } from '@/components/modules/ModuleConfig';
import { PageHead } from '@/components/seo/PageHead';
import { sodConfig } from '../config';

export default function SoDConfigPage() {
  return (
    <>
      <PageHead
        title="SoD Configuration"
        description="Configure Segregation of Duties rules, thresholds, and analysis parameters"
      />
      <ModuleTemplate config={sodConfig}>
        <ModuleConfig config={sodConfig.config} moduleId="sod" />
      </ModuleTemplate>
    </>
  );
}
