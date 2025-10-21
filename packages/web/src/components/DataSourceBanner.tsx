'use client';

import { useState, useEffect } from 'react';
import { isAPIConnected } from '@/lib/featureFlags';

export function DataSourceBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsConnected(isAPIConnected());
  }, []);

  if (!isMounted || isConnected) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong className="font-bold">Development Mode: </strong>
            Using mock data. API connection is disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
