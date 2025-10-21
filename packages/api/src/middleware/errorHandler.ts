import { Request, Response, NextFunction } from 'express';
import { FrameworkError } from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // Always log full error details server-side
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    type: error.name,
  });

  if (error instanceof FrameworkError) {
    // Sanitize error details in production
    const sanitizedMessage = isProduction && error.statusCode >= 500
      ? 'An error occurred while processing your request'
      : error.message;

    const sanitizedDetails = isProduction
      ? undefined
      : error.sapError;

    ApiResponseUtil.error(
      res,
      error.type,
      sanitizedMessage,
      error.statusCode || 500,
      sanitizedDetails
    );
    return;
  }

  if (error.name === 'ValidationError') {
    // Validation errors are safe to expose (user input issues)
    ApiResponseUtil.badRequest(res, error.message);
    return;
  }

  // Generic server errors - sanitize in production
  ApiResponseUtil.serverError(res, error);
}

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  ApiResponseUtil.notFound(res, 'Endpoint');
}