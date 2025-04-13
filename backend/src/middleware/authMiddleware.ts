import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { ApiError } from './errorMiddleware';

// Extend Express Request with user property
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

/**
 * Middleware to authenticate requests using JWT token from Authorization header
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Missing or invalid authorization token');
    }

    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      logger.warn('Authentication failed:', error?.message);
      throw new ApiError(401, 'Invalid or expired authorization token');
    }

    // Store user data in request for controller use
    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.app_metadata?.role || 'user',
    };

    logger.info(`User authenticated: ${req.user.id}`);
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      logger.error('Error in authentication middleware:', error);
      next(new ApiError(500, 'Authentication error'));
    }
  }
}

/**
 * Middleware to check if a user has admin role
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  if (req.user.role !== 'admin') {
    next(new ApiError(403, 'Admin access required'));
    return;
  }

  next();
}

// For development use only when Supabase auth is not available
export function mockAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV !== 'development') {
    next(new ApiError(401, 'Mock authentication only available in development'));
    return;
  }

  // Create a mock user for testing
  req.user = {
    id: process.env.MOCK_USER_ID || '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
    role: 'user',
  };

  logger.warn(`Using mock authentication with user ID: ${req.user.id}`);
  next();
}

export default {
  authenticate,
  requireAdmin,
  mockAuthenticate,
};