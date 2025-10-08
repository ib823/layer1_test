/**
 * SoD Control Module - Main Export
 *
 * Segregation of Duties audit and control for SAP Framework
 */

// Types
export * from './types';

// Connectors
export * from './connectors';

// Services
export { AccessGraphService } from './services/AccessGraphService';

// Engine
export { RuleEngine } from './engine/RuleEngine';

// Version
export const VERSION = '1.0.0';
