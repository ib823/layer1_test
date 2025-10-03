import { Request, Response, NextFunction } from 'express';
import { FrameworkError } from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  if (error instanceof FrameworkError) {
    ApiResponseUtil.error(
      res,
      error.type,
      error.message,
      error.statusCode || 500,
      error.sapError
    );
    return;
  }

  if (error.name === 'ValidationError') {
    ApiResponseUtil.badRequest(res, error.message);
    return;
  }

  ApiResponseUtil.serverError(res, error);
}

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  ApiResponseUtil.notFound(res, 'Endpoint');
}