/**
 * ERP Context Provider
 *
 * Provides the current ERP system to all components in the tree.
 * This allows components to automatically adapt terminology.
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { type ERPSystem } from '@/lib/terminology/erpTerminology';

interface ERPContextValue {
  /** Current ERP system */
  erpSystem: ERPSystem;
  /** Change the ERP system */
  setERPSystem: (system: ERPSystem) => void;
  /** Whether multi-ERP mode is enabled */
  isMultiERP: boolean;
}

const ERPContext = createContext<ERPContextValue | undefined>(undefined);

export interface ERPProviderProps {
  children: React.ReactNode;
  /** Initial ERP system (default: SAP) */
  defaultSystem?: ERPSystem;
  /** Enable multi-ERP mode (shows ERP selector) */
  multiERP?: boolean;
}

/**
 * ERP Context Provider
 *
 * Wrap your app with this to enable ERP terminology features.
 *
 * @example
 * ```tsx
 * <ERPProvider defaultSystem="SAP" multiERP={true}>
 *   <App />
 * </ERPProvider>
 * ```
 */
export function ERPProvider({
  children,
  defaultSystem = 'SAP',
  multiERP = false,
}: ERPProviderProps) {
  const [erpSystem, setERPSystemState] = useState<ERPSystem>(defaultSystem);

  // Load ERP system from localStorage (persists across page reloads)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedERPSystem') as ERPSystem | null;
      if (saved && ['SAP', 'Oracle', 'Dynamics', 'NetSuite'].includes(saved)) {
        setERPSystemState(saved);
      }
    }
  }, []);

  // Save ERP system to localStorage
  const setERPSystem = (system: ERPSystem) => {
    setERPSystemState(system);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedERPSystem', system);
    }
  };

  return (
    <ERPContext.Provider value={{ erpSystem, setERPSystem, isMultiERP: multiERP }}>
      {children}
    </ERPContext.Provider>
  );
}

/**
 * Hook to access ERP context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { erpSystem } = useERPContext();
 *   return <ERPTermTooltip erpSystem={erpSystem} term="Company Code" />;
 * }
 * ```
 */
export function useERPContext(): ERPContextValue {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERPContext must be used within ERPProvider');
  }
  return context;
}

/**
 * Hook to get ERP-specific terminology
 */
export function useERPTerm() {
  const { erpSystem } = useERPContext();

  return {
    erpSystem,
    /**
     * Get definition for a term
     */
    getDefinition: (term: string) => {
      const { getTermDefinition } = require('@/lib/terminology/erpTerminology');
      return getTermDefinition(erpSystem, term);
    },
    /**
     * Get universal term
     */
    toUniversal: (term: string) => {
      const { getUniversalTerm } = require('@/lib/terminology/erpTerminology');
      return getUniversalTerm(erpSystem, term);
    },
  };
}
