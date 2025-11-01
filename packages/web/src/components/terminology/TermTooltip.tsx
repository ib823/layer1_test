/**
 * Term Tooltip Component
 *
 * Accessible tooltip for explaining technical terminology
 * Provides contextual help without overwhelming users
 *
 * WCAG Compliance:
 * - 1.4.13 Content on Hover or Focus (Level AA)
 * - 3.3.5 Help (Level AAA - bonus)
 * - Keyboard accessible (can be triggered with focus)
 * - Dismissible (Escape key)
 * - Hoverable (tooltip doesn't disappear when hovering over it)
 *
 * @example
 * ```tsx
 * <TermTooltip
 *   term="SoD"
 *   fullTerm="Segregation of Duties"
 *   definition="A security principle that prevents any single person from having complete control over a critical process."
 *   example="The person who approves payments should not also be able to create invoices."
 * >
 *   SoD
 * </TermTooltip>
 * ```
 */

'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface TermTooltipProps {
  /** Short term or acronym */
  term: string;
  /** Full expansion of term (if acronym) */
  fullTerm?: string;
  /** Clear definition in plain language */
  definition: string;
  /** Optional example for clarity */
  example?: string;
  /** The text to wrap (usually the term itself) */
  children: React.ReactNode;
  /** Whether to show the help icon */
  showIcon?: boolean;
}

export const TermTooltip: React.FC<TermTooltipProps> = ({
  term,
  fullTerm,
  definition,
  example,
  children,
  showIcon = true,
}) => {
  const glossaryLink = `/glossary#${term.toLowerCase().replace(/\s+/g, '-')}`;

  const tooltipContent = (
    <div style={{ maxWidth: '300px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
        {fullTerm || term}
      </div>
      <p style={{ margin: '4px 0 8px 0', fontSize: '13px' }}>
        {definition}
      </p>
      {example && (
        <p style={{ margin: '4px 0 8px 0', fontSize: '12px', fontStyle: 'italic', opacity: 0.9 }}>
          <strong>Example:</strong> {example}
        </p>
      )}
      <Link
        href={glossaryLink}
        style={{ fontSize: '12px', textDecoration: 'underline' }}
      >
        Learn more in glossary →
      </Link>
    </div>
  );

  return (
    <Tooltip
      title={tooltipContent}
      trigger={['hover', 'focus']}
      overlayStyle={{ maxWidth: '350px' }}
      mouseEnterDelay={0.3}
    >
      <span
        style={{
          borderBottom: '1px dotted var(--border-strong)',
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        tabIndex={0}
        role="button"
        aria-label={`${term}: ${definition}`}
      >
        {children}
        {showIcon && (
          <QuestionCircleOutlined
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              verticalAlign: 'middle',
            }}
            aria-hidden="true"
          />
        )}
      </span>
    </Tooltip>
  );
};

export default TermTooltip;
