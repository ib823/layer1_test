/**
 * ERP System Selector
 *
 * Allows users to select which ERP system they're using.
 * Only shown in multi-ERP mode.
 */

'use client';

import { Select } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { useERPContext } from './ERPContext';
import { type ERPSystem } from '@/lib/terminology/erpTerminology';

const erpOptions = [
  {
    value: 'SAP' as ERPSystem,
    label: 'SAP S/4HANA',
    icon: '🔷',
  },
  {
    value: 'Oracle' as ERPSystem,
    label: 'Oracle Fusion',
    icon: '🔴',
  },
  {
    value: 'Dynamics' as ERPSystem,
    label: 'Microsoft Dynamics 365',
    icon: '🟦',
  },
  {
    value: 'NetSuite' as ERPSystem,
    label: 'NetSuite ERP',
    icon: '🟠',
  },
];

export interface ERPSelectorProps {
  /** Custom className */
  className?: string;
  /** Show as compact button instead of full dropdown */
  compact?: boolean;
}

/**
 * ERP System Selector Component
 *
 * @example
 * ```tsx
 * <ERPSelector />
 * ```
 */
export function ERPSelector({ className = '', compact = false }: ERPSelectorProps) {
  const { erpSystem, setERPSystem, isMultiERP } = useERPContext();

  if (!isMultiERP) {
    return null; // Don't show selector if multi-ERP is disabled
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!compact && (
        <span className="text-sm text-gray-600 flex items-center gap-1">
          <DatabaseOutlined />
          ERP System:
        </span>
      )}
      <Select
        value={erpSystem}
        onChange={setERPSystem}
        className="min-w-[200px]"
        size={compact ? 'small' : 'middle'}
        options={erpOptions.map((opt) => ({
          value: opt.value,
          label: (
            <span>
              <span className="mr-2">{opt.icon}</span>
              {opt.label}
            </span>
          ),
        }))}
      />
    </div>
  );
}

/**
 * ERP System Badge - shows current ERP as a small badge
 */
export function ERPBadge({ className = '' }: { className?: string }) {
  const { erpSystem } = useERPContext();
  const option = erpOptions.find((opt) => opt.value === erpSystem);

  if (!option) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 ${className}`}
    >
      <span>{option.icon}</span>
      <span className="font-medium">{option.label}</span>
    </span>
  );
}
