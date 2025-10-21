'use client';

import { useEffect } from 'react';

/**
 * Root level error handler for Next.js 15
 * Catches errors in the app directory
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Root error:', error);

    // TODO: Send to monitoring service
    // logErrorToService({
    //   error: error.message,
    //   stack: error.stack,
    //   digest: error.digest,
    //   timestamp: new Date().toISOString(),
    // });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="max-w-md bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-4 text-critical">
          Something went wrong!
        </h2>
        <p className="text-secondary mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>

        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="text-xs text-gray-500 mb-4">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="btn btn-primary"
          >
            Try again
          </button>
          <a href="/" className="btn btn-secondary">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
