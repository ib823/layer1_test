import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ApiResponseUtil } from '../utils/response';

export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        ApiResponseUtil.badRequest(res, 'Validation failed', error.errors);
      } else {
        next(error);
      }
    }
  };
}

// Common validation schemas
export const schemas = {
  tenantId: z.object({
    tenantId: z.string().min(1, 'Tenant ID is required'),
  }),
  
  createTenant: z.object({
    tenantId: z.string().min(1, 'Tenant ID is required'),
    companyName: z.string().min(1, 'Company name is required'),
    sapConnection: z.object({
      baseUrl: z.string().url('Invalid SAP base URL'),
      client: z.string().optional(),
      auth: z.object({
        type: z.enum(['OAUTH', 'BASIC', 'CERTIFICATE']),
        credentials: z.any(),
      }),
    }),
  }),
  
  updateTenant: z.object({
    companyName: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  }),
  
  moduleActivation: z.object({
    config: z.record(z.any()).optional(),
    reason: z.string().optional(),
  }),
  
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
};