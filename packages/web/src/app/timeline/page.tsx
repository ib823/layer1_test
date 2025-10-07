'use client';

import { Timeline } from '@/components/ui/Timeline';
import { MockDataBanner } from '@/components/ui';
import { mockTimelineData } from '@/data/timeline-data';
import { isFeatureEnabled, FeatureFlag } from '@/lib/featureFlags';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TimelinePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const router = useRouter();

  // Check if live timeline data is enabled
  const isLiveDataEnabled = isFeatureEnabled(FeatureFlag.LIVE_TIMELINE_DATA);

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Activity Timeline
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Recent activity and events across the platform
        </p>
      </div>

      {/* Show banner if using mock data */}
      {!isLiveDataEnabled && (
        <div style={{ marginBottom: '1.5rem' }}>
          <MockDataBanner
            onConfigure={() => router.push('/admin/connectors')}
          />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 2000);
          }}
        >
          Test Loading State (2s)
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowEmpty(!showEmpty)}
        >
          Toggle Empty State
        </button>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="card-body">
          <Timeline
            items={showEmpty ? [] : mockTimelineData}
            loading={isLoading}
            emptyMessage="No recent activity found. Check back later."
          />
        </div>
      </div>

      {/* Test Instructions */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Test Instructions
        </h2>
        <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>View timeline with different event types (violation, resolution, review, system, update)</li>
          <li>Click &quot;Test Loading State&quot; to see skeleton loaders</li>
          <li>Click &quot;Toggle Empty State&quot; to see empty state message</li>
          <li>Each event shows timestamp, title, description, and user</li>
          <li>Color-coded markers indicate event type</li>
        </ul>
      </div>
    </main>
  );
}