export type DiscoveryResult = {
  systems: Array<{
    name: string;
    type: 'S4HANA' | 'BTP' | 'Ariba' | 'Unknown';
    endpoints: Array<{ name: string; url: string; auth: 'OAuth2' | 'Basic' | 'None' }>;
  }>;
};

export async function runDiscovery(_tenantId: string): Promise<DiscoveryResult> {
  // Stub – replace with real probes later
  return {
    systems: [
      {
        name: 'SAP S/4HANA (stub)',
        type: 'S4HANA',
        endpoints: [
          { name: 'OData v2', url: 'https://s4.example.com/sap/opu/odata', auth: 'OAuth2' }
        ]
      },
      {
        name: 'BTP (stub)',
        type: 'BTP',
        endpoints: [{ name: 'Destination', url: 'https://btp.destinations', auth: 'OAuth2' }]
      }
    ]
  };
}
