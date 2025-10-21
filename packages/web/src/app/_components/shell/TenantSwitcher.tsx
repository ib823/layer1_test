'use client';

/**
 * TenantSwitcher Component
 *
 * Dropdown to switch between tenants the user has access to.
 * Shows current tenant name and logo.
 */

import { useState } from 'react';
import { Select, Avatar, Space } from '@sap-framework/ui';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';

interface Tenant {
  id: string;
  name: string;
  logo?: string;
}

// TODO: Replace with actual API call
async function fetchTenants(): Promise<Tenant[]> {
  // Mock data for now
  return [
    { id: 'abm', name: 'ABeam Holdings', logo: '/logos/abm.svg' },
    { id: 'demo', name: 'Demo Corp', logo: '/logos/demo.svg' },
    { id: 'acme', name: 'ACME Corporation', logo: '/logos/acme.svg' },
  ];
}

export function TenantSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentTenantId = params?.tenantId as string;

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
  });

  const currentTenant = tenants?.find((t) => t.id === currentTenantId);

  const handleChange = (tenantId: string) => {
    router.push(`/t/${tenantId}/dashboard`);
  };

  if (isLoading) {
    return (
      <div className="w-48 h-10 bg-surface-secondary animate-pulse rounded-md" />
    );
  }

  return (
    <Select
      value={currentTenantId}
      onChange={handleChange}
      className="min-w-[200px]"
      placeholder="Select tenant"
      options={tenants?.map((tenant) => ({
        value: tenant.id,
        label: (
          <Space>
            <Avatar size="small" src={tenant.logo} className="bg-brand-primary">
              {tenant.name.charAt(0)}
            </Avatar>
            <span>{tenant.name}</span>
          </Space>
        ),
      }))}
      suffixIcon={
        currentTenant ? (
          <Avatar size="small" src={currentTenant.logo} className="bg-brand-primary">
            {currentTenant.name.charAt(0)}
          </Avatar>
        ) : null
      }
    />
  );
}
