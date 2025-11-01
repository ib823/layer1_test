'use client';

import { Button, useToast } from '@/components/ui';
import { PageHead } from '@/components/seo/PageHead';

export default function TestToastPage() {
  const toast = useToast();

  return (
    <>
      <PageHead
        title="Toast Notification Test"
        description="Test page for toast notification component with success, error, warning, and info variants"
      />
      <main style={{ padding: '2rem' }}>
        <h1>Toast Notification Test</h1>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={() => toast.success('Operation completed successfully!')}>
          Show Success
        </Button>
        <Button variant="danger" onClick={() => toast.error('An error occurred. Please try again.')}>
          Show Error
        </Button>
        <Button variant="secondary" onClick={() => toast.warning('This action requires confirmation.')}>
          Show Warning
        </Button>
        <Button variant="ghost" onClick={() => toast.info('New violation detected in system.')}>
          Show Info
        </Button>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h2>Instructions:</h2>
        <ul>
          <li>Click buttons to test different toast types</li>
          <li>Toasts auto-dismiss after 5 seconds</li>
          <li>Click × button to manually close</li>
        </ul>
      </div>
      </main>
    </>
  );
}