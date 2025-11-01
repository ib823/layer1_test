/**
 * Term Component
 *
 * Convenient wrapper for TermTooltip that automatically fetches definition from the terminology library.
 * Makes it easy to add terminology tooltips throughout the app.
 *
 * @example
 * ```tsx
 * // Simple usage
 * <Term>SoD</Term>
 *
 * // Custom display text
 * <Term termKey="sod">Segregation of Duties</Term>
 *
 * // Without icon
 * <Term termKey="rbac" showIcon={false}>RBAC</Term>
 * ```
 */

'use client';

import React from 'react';
import { TermTooltip } from './TermTooltip';
import { getTerm } from '@/lib/terminology/terms';

interface TermProps {
  /** The term key to look up in the terminology library */
  termKey?: string;
  /** The text to display (if different from term) */
  children: React.ReactNode;
  /** Whether to show the help icon */
  showIcon?: boolean;
}

export const Term: React.FC<TermProps> = ({ termKey, children, showIcon = true }) => {
  // Try to find the term in the library
  let lookupKey = termKey;

  // If no termKey provided, try to use children as the key
  if (!lookupKey && typeof children === 'string') {
    lookupKey = children.toLowerCase().replace(/\s+/g, '-');
  }

  const termDef = lookupKey ? getTerm(lookupKey) : undefined;

  // If term not found in library, just return the children without tooltip
  if (!termDef) {
    return <>{children}</>;
  }

  return (
    <TermTooltip
      term={termDef.term}
      fullTerm={termDef.fullTerm}
      definition={termDef.definition}
      example={termDef.example}
      showIcon={showIcon}
    >
      {children}
    </TermTooltip>
  );
};

export default Term;
