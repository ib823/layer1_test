import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SAP MVP Framework API',
      version,
      description: `
Multi-tenant SAP Governance, Risk & Compliance platform API.

## Features
- **Automatic Service Discovery** - Scan SAP Gateway catalog
- **Multi-Tenant Architecture** - Isolated data per tenant
- **SoD Analysis** - Segregation of Duties conflict detection
- **Capability Profiling** - Tenant-specific feature enablement

## Authentication
All endpoints require Bearer token authentication (except /health and /version).

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Base URL
- Development: \`http://localhost:3000/api\`
- Staging: \`https://staging.sapframework.com/api\`
- Production: \`https://api.sapframework.com/api\`
      `.trim(),
      contact: {
        name: 'API Support',
        email: 'ikmal.baharudin@gmail.com',
      },
      license: {
        name: 'Proprietary',
        url: 'https://example.com/license',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://staging.sapframework.com/api',
        description: 'Staging server',
      },
      {
        url: 'https://api.sapframework.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'UNAUTHORIZED' },
                      message: { type: 'string', example: 'Authentication required' },
                    },
                  },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'FORBIDDEN' },
                      message: { type: 'string', example: 'Insufficient permissions' },
                    },
                  },
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'NOT_FOUND' },
                      message: { type: 'string', example: 'Resource not found' },
                    },
                  },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'VALIDATION_ERROR' },
                      message: { type: 'string', example: 'Invalid request data' },
                      details: {
                        type: 'object',
                        description: 'Validation error details',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      schemas: {
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenantId: { type: 'string' },
            companyName: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TenantCapabilityProfile: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            sapVersion: { type: 'string', enum: ['ECC6', 'S4_ON_PREM', 'S4_CLOUD', 'UNKNOWN'] },
            discoveredAt: { type: 'string', format: 'date-time' },
            availableServices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  technicalName: { type: 'string' },
                  endpoint: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
            capabilities: {
              type: 'object',
              properties: {
                canDoSoD: { type: 'boolean' },
                canDoInvoiceMatching: { type: 'boolean' },
                canDoAnomalyDetection: { type: 'boolean' },
              },
            },
            missingServices: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        SoDViolation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenantId: { type: 'string' },
            userId: { type: 'string' },
            userName: { type: 'string' },
            userEmail: { type: 'string', format: 'email' },
            conflictType: { type: 'string' },
            riskLevel: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            conflictingRoles: {
              type: 'array',
              items: { type: 'string' },
            },
            status: { type: 'string', enum: ['OPEN', 'ACKNOWLEDGED', 'REMEDIATED', 'ACCEPTED_RISK'] },
            detectedAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              description: 'Response data',
            },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' },
                version: { type: 'string' },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          allOf: [
            { $ref: '#/components/schemas/ApiResponse' },
            {
              type: 'object',
              properties: {
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalItems: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          ],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'System',
        description: 'System health and version endpoints',
      },
      {
        name: 'Tenants',
        description: 'Tenant management operations',
      },
      {
        name: 'Discovery',
        description: 'SAP service discovery operations',
      },
      {
        name: 'SoD',
        description: 'Segregation of Duties analysis',
      },
      {
        name: 'Onboarding',
        description: 'Tenant onboarding workflow',
      },
      {
        name: 'Monitoring',
        description: 'System monitoring and health checks',
      },
    ],
  },
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
