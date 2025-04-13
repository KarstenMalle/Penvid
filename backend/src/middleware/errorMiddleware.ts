import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom error class
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found error handler - for routes that don't exist
export function notFound(req: Request, res: Response, next: NextFunction) {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
}

// Generic error handler
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;

  // Log the error details
  if (statusCode === 500) {
    logger.error('Internal Server Error:', err);
  } else {
    logger.warn(`${err.name}: ${err.message}`);
  }

  // Send error response
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
}

export default {
  ApiError,
  notFound,
  errorHandler,
};