/**
 * ERP Term Tooltip Component
 *
 * Displays ERP-specific terms with helpful tooltips explaining what they mean.
 * Helps users understand unfamiliar ERP jargon.
 */

'use client';

import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { getTermDefinition, type ERPSystem } from '@/lib/terminology/erpTerminology';

export interface ERPTermTooltipProps {
  /** ERP system (SAP, Oracle, Dynamics, NetSuite) */
  erpSystem: ERPSystem;
  /** The ERP-specific term to explain */
  term: string;
  /** Whether to show the universal term inline */
  showUniversal?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Displays an ERP term with a tooltip explanation
 *
 * @example
 * ```tsx
 * <ERPTermTooltip erpSystem="SAP" term="Company Code" />
 * // Shows: Company Code ⓘ
 * // Tooltip: Legal Entity - An independent accounting entity with its own balance sheet
 * ```
 */
export function ERPTermTooltip({
  erpSystem,
  term,
  showUniversal = false,
  className = '',
}: ERPTermTooltipProps) {
  const definition = getTermDefinition(erpSystem, term);

  if (!definition) {
    // No definition found, just show the term
    return <span className={className}>{term}</span>;
  }

  const tooltipContent = (
    <div className="max-w-sm">
      <div className="font-semibold mb-1">{definition.universal}</div>
      <div className="text-sm mb-2">{definition.explanation}</div>
      {definition.details && (
        <div className="text-xs text-gray-300 border-t border-gray-600 pt-2 mt-2">
          {definition.details}
        </div>
      )}
    </div>
  );

  const displayTerm = showUniversal ? definition.universal : term;

  return (
    <Tooltip title={tooltipContent} placement="top">
      <span className={`inline-flex items-center gap-1 cursor-help border-b border-dotted border-gray-400 ${className}`}>
        {displayTerm}
        <QuestionCircleOutlined className="text-xs text-gray-400" />
      </span>
    </Tooltip>
  );
}

/**
 * Simple inline ERP term with tooltip (no icon)
 */
export function ERPTerm({
  erpSystem,
  term,
  className = '',
}: Omit<ERPTermTooltipProps, 'showUniversal'>) {
  const definition = getTermDefinition(erpSystem, term);

  if (!definition) {
    return <span className={className}>{term}</span>;
  }

  const tooltipContent = (
    <div className="max-w-sm">
      <div className="font-semibold mb-1">{definition.universal}</div>
      <div className="text-sm">{definition.explanation}</div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="top">
      <span className={`cursor-help border-b border-dotted border-gray-400 ${className}`}>
        {term}
      </span>
    </Tooltip>
  );
}
