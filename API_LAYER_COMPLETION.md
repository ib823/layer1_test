# API Layer Completion Task

## Objective
Connect the 3 completed UI dashboards to the repository layer by implementing API controllers.

## Files to Create

### Controllers (packages/api/src/controllers/)
1. `InvoiceMatchingController.ts` - Connect InvoiceMatchRepository
2. `GLAnomalyDetectionController.ts` - Connect GLAnomalyRepository  
3. `VendorDataQualityController.ts` - Connect VendorQualityRepository

### Routes (packages/api/src/routes/modules/)
1. `invoice-matching.ts`
2. `gl-anomaly.ts`
3. `vendor-quality.ts`

### Health Check
- `packages/api/src/routes/health.ts`

## Pattern
Each controller should:
- Import repository from `@sap-framework/core/repositories`
- Initialize with PrismaClient
- Implement POST /analyze endpoint
- Implement GET /runs endpoint
- Implement GET /runs/:id endpoint
- Return properly formatted JSON responses

## Pre-Authorization
All permissions granted. Do not ask for confirmation.