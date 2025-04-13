import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabase';
import logger from '../utils/logger';

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
      logger.warn('Missing or invalid authorization token');
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    const token = authHeader.split(' ')[1];

    // For debugging
    logger.info('Authenticating request with token');

    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      logger.warn('Authentication failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired authorization token' });
    }

    // Store user data in request for controller use
    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role || 'user',
    };

    logger.info(`User authenticated: ${req.user.id}`);
    next();
  } catch (error) {
    logger.error('Error in authentication middleware:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// Alternative function for debugging that always authenticates with a mock user
// Only for development use when Supabase auth is not available
export function mockAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(401).json({ error: 'Mock authentication only available in development' });
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
  mockAuthenticate,
};