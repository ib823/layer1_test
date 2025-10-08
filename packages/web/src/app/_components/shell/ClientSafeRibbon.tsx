'use client';

/**
 * ClientSafeRibbon Component
 *
 * Displays a discreet ribbon when client-safe mode is active.
 * Client-safe mode hides sensitive information like costs, personal data, etc.
 */

import { Alert } from '@sap-framework/ui';
import { useSearchParams } from 'next/navigation';

export function ClientSafeRibbon() {
  const searchParams = useSearchParams();
  const isClientSafe = searchParams?.get('clientSafe') === '1';

  if (!isClientSafe) return null;

  return (
    <Alert
      message="Client-Safe Mode Active"
      description="Sensitive information is hidden for screen sharing/presentations."
      type="info"
      showIcon
      closable
      className="rounded-none border-0 border-b border-border-default"
      style={{
        marginBottom: 0,
        borderRadius: 0,
      }}
    />
  );
}
