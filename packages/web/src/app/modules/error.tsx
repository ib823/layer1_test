'use client';

import { useEffect } from 'react';

/**
 * Error handler for /modules/* routes
 */
export default function ModulesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Modules error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-critical">
          Module Error
        </h2>
        <p className="text-secondary mb-6">
          Failed to load the module. {error.message}
        </p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset} className="btn btn-primary">
            Retry
          </button>
          <a href="/dashboard" className="btn btn-secondary">
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
