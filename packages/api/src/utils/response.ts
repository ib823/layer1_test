import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export class ApiResponseUtil {
  static success<T>(res: Response, data: T, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || 'unknown',
        version: '1.0.0',
      },
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    pageSize: number,
    totalItems: number
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || 'unknown',
        version: '1.0.0',
      },
    };
    return res.status(200).json(response);
  }

  static error(
    res: Response,
    code: string,
    message: string,
    statusCode: number = 500,
    details?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || 'unknown',
        version: '1.0.0',
      },
    };
    return res.status(statusCode).json(response);
  }

  static notFound(res: Response, resource: string = 'Resource'): Response {
    return this.error(res, 'NOT_FOUND', `${resource} not found`, 404);
  }

  static badRequest(res: Response, message: string, details?: any): Response {
    return this.error(res, 'BAD_REQUEST', message, 400, details);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, 'UNAUTHORIZED', message, 401);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, 'FORBIDDEN', message, 403);
  }

  static serverError(res: Response, error: Error): Response {
    console.error('Server error:', error);
    return this.error(
      res,
      'INTERNAL_SERVER_ERROR',
      'An internal server error occurred',
      500,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }
}