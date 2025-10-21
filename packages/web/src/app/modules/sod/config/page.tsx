'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/modules/ModuleTemplate';
import { ModuleConfig } from '@/components/modules/ModuleConfig';
import { sodConfig } from '../config';

export default function SoDConfigPage() {
  return (
    <ModuleTemplate config={sodConfig}>
      <ModuleConfig config={sodConfig.config} moduleId="sod" />
    </ModuleTemplate>
  );
}
