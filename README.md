# @sap-framework/core

The core layer (Layer 1) of the SAP MVP Framework.

## What is This?

This package provides the foundational components for building SAP applications:

- **SAP Connectors**: Connect to S/4HANA, IPS, and other SAP systems
- **Authentication**: XSUAA integration for SAP BTP
- **Event Bus**: Pub/sub pattern for decoupled components
- **Error Handling**: Robust error handling with retry logic
- **Caching**: Performance optimization layer
- **Configuration**: Centralized configuration management

## Installation
```bash
pnpm add @sap-framework/core
Quick Start
typescriptimport { BaseSAPConnector, EventBus } from '@sap-framework/core';

// Create SAP connector
class MyConnector extends BaseSAPConnector {
  // Implement abstract methods
}

// Use event bus
const eventBus = EventBus.getInstance();
eventBus.subscribe('my-event', (data) => {
  console.log('Event received:', data);
});
Architecture
Layer 1 is designed to be:

Domain-agnostic: No business logic
Reusable: Used by all Layer 2 services
Reliable: Built-in retry, circuit breakers, error handling
Observable: Events for all operations

Development
bash# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint
License
MIT