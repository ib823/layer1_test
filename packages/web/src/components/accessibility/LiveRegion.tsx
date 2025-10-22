/**
 * Live Region Component
 *
 * Announces dynamic content changes to screen readers.
 * Used for notifications, loading states, etc.
 */

'use client';

import React, { useEffect, useRef } from 'react';

export interface LiveRegionProps {
  /** Content to announce */
  message: string;
  /** Politeness level */
  politeness?: 'polite' | 'assertive' | 'off';
  /** Whether the region is atomic (announce entire content on change) */
  atomic?: boolean;
  /** Whether to clear message after announcing */
  clearAfter?: number;
}

/**
 * Live Region for Screen Reader Announcements
 *
 * @example
 * ```tsx
 * const [message, setMessage] = useState('');
 *
 * // When data loads
 * setMessage('5 violations found');
 *
 * <LiveRegion message={message} politeness="polite" />
 * ```
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  atomic = true,
  clearAfter,
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clearAfter && message) {
      const timer = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Hook for managing live region announcements
 */
export function useLiveRegion(politeness: 'polite' | 'assertive' = 'polite') {
  const [message, setMessage] = React.useState('');

  const announce = (msg: string, clearAfterMs?: number) => {
    setMessage(msg);

    if (clearAfterMs) {
      setTimeout(() => setMessage(''), clearAfterMs);
    }
  };

  const LiveRegionComponent = () => (
    <LiveRegion message={message} politeness={politeness} />
  );

  return {
    announce,
    LiveRegion: LiveRegionComponent,
  };
}
