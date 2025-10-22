// Multi-ERP Base Connector
export * from './base/BaseERPConnector';

// Legacy SAP-specific (maintained for backward compatibility)
export * from './base/BaseSAPConnector';
export * from './base/ServiceDiscovery';
export * from './base/ServiceDiscoveryTypes';

// ERP Connectors
export * from './s4hana';
export * from './oracle';
export * from './dynamics';
export * from './netsuite';
export * from './ips';
export * from './ariba';
export * from './successfactors';