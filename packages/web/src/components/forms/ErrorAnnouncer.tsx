/**
 * Error Announcer Component
 *
 * WCAG 2.1 AA compliant error announcement component that provides:
 * - Live region for error announcements (4.1.3)
 * - Assertive announcement for critical errors (3.3.1)
 * - Polite announcement for success messages (4.1.3)
 * - Auto-clear after specified duration
 *
 * @example
 * ```tsx
 * const [error, setError] = useState<string>('');
 * const [success, setSuccess] = useState<string>('');
 *
 * <ErrorAnnouncer
 *   errorMessage={error}
 *   successMessage={success}
 *   onClearError={() => setError('')}
 *   onClearSuccess={() => setSuccess('')}
 * />
 *
 * // Trigger announcements:
 * setError('Failed to save. Please try again.');
 * setSuccess('Changes saved successfully!');
 * ```
 */

'use client';

import React, { useEffect } from 'react';

interface ErrorAnnouncerProps {
  /** Error message to announce (aria-live="assertive") */
  errorMessage?: string;
  /** Success message to announce (aria-live="polite") */
  successMessage?: string;
  /** Info message to announce (aria-live="polite") */
  infoMessage?: string;
  /** Callback when error should be cleared */
  onClearError?: () => void;
  /** Callback when success should be cleared */
  onClearSuccess?: () => void;
  /** Callback when info should be cleared */
  onClearInfo?: () => void;
  /** Auto-clear duration in ms (default: 10000ms = 10s) */
  autoClearDuration?: number;
}

export const ErrorAnnouncer: React.FC<ErrorAnnouncerProps> = ({
  errorMessage,
  successMessage,
  infoMessage,
  onClearError,
  onClearSuccess,
  onClearInfo,
  autoClearDuration = 10000,
}) => {
  // Auto-clear error after duration
  useEffect(() => {
    if (errorMessage && onClearError && autoClearDuration > 0) {
      const timer = setTimeout(onClearError, autoClearDuration);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, onClearError, autoClearDuration]);

  // Auto-clear success after duration
  useEffect(() => {
    if (successMessage && onClearSuccess && autoClearDuration > 0) {
      const timer = setTimeout(onClearSuccess, autoClearDuration);
      return () => clearTimeout(timer);
    }
  }, [successMessage, onClearSuccess, autoClearDuration]);

  // Auto-clear info after duration
  useEffect(() => {
    if (infoMessage && onClearInfo && autoClearDuration > 0) {
      const timer = setTimeout(onClearInfo, autoClearDuration);
      return () => clearTimeout(timer);
    }
  }, [infoMessage, onClearInfo, autoClearDuration]);

  return (
    <>
      {/* Error announcer - assertive (interrupts screen reader) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {errorMessage}
      </div>

      {/* Success announcer - polite (waits for screen reader) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {successMessage}
      </div>

      {/* Info announcer - polite */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {infoMessage}
      </div>
    </>
  );
};

export default ErrorAnnouncer;
