'use client';

/**
 * Tenant Layout
 *
 * Shell layout for all tenant-specific pages.
 * Includes header, sidebar, and main content area.
 */

import { AppHeader } from '../../_components/shell/AppHeader';
import { AppSidebar } from '../../_components/shell/AppSidebar';
import { ClientSafeRibbon } from '../../_components/shell/ClientSafeRibbon';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenantId } = await params;

  return (
    <div className="flex flex-col h-screen">
      {/* Client-Safe Mode Ribbon */}
      <ClientSafeRibbon />

      {/* App Header */}
      <AppHeader />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AppSidebar tenantId={tenantId} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-surface-secondary">
          <div className="container mx-auto p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
