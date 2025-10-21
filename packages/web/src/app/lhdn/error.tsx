'use client';

import { useEffect } from 'react';

/**
 * Error handler for LHDN e-Invoice module
 */
export default function LHDNError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('LHDN module error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-critical">
          LHDN e-Invoice Error
        </h2>
        <p className="text-secondary mb-6">
          Failed to process e-invoice operation. {error.message}
        </p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset} className="btn btn-primary">
            Retry
          </button>
          <a href="/lhdn" className="btn btn-secondary">
            LHDN Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
