'use client';

import { useEffect } from 'react';
import { Button } from 'antd';
import { useRouter } from 'next/navigation';

/**
 * Error boundary for Admin section
 * Catches errors in connector management, system settings, etc.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error to monitoring service
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="max-w-md bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h2 className="text-2xl font-bold mb-4 text-critical">
          Administration Error
        </h2>
        <p className="text-secondary mb-2">
          An error occurred in the administration panel.
        </p>
        <p className="text-sm text-gray-600 mb-6">
          {error.message || 'Unable to load administration settings'}
        </p>

        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="text-xs text-gray-500 mb-4">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-4 justify-center flex-wrap">
          <Button type="primary" onClick={reset}>
            Try again
          </Button>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
