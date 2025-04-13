import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { ApiError } from '../middleware/errorMiddleware';
import logger from '../utils/logger';
import { getUserProfile, createUserProfile } from '../services/userService';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Server error
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    if (password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    // Register user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('already in use')) {
        throw new ApiError(409, 'Email is already in use');
      }
      throw new ApiError(400, error.message);
    }

    if (!data.user || !data.session) {
      // Email confirmation may be required
      return res.status(201).json({
        message: 'User registration initiated. Please check your email for confirmation.',
        requiresConfirmation: true
      });
    }

    // Create initial profile after successful registration
    const userId = data.user.id;
    await createUserProfile(userId, {
      language_preference: 'en',
      currency_preference: 'USD' as any,
      country_preference: 'US',
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Registration error:', error);
    throw new ApiError(500, 'Failed to register user');
  }
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    // Login with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user profile exists, create if it doesn't
    const userProfile = await getUserProfile(data.user.id);
    if (!userProfile) {
      await createUserProfile(data.user.id);
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Login error:', error);
    throw new ApiError(500, 'Failed to login');
  }
}

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out a user
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Logout successful
 *       500:
 *         description: Server error
 */
export async function logout(req: Request, res: Response) {
  try {
    // Get token from auth header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // Sign out the user
      await supabase.auth.signOut();
    }

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error:', error);
    throw new ApiError(500, 'Failed to logout');
  }
}

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'Email is required');
    }

    // Send password reset email using Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      throw new ApiError(400, error.message);
    }

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Forgot password error:', error);
    throw new ApiError(500, 'Failed to send password reset email');
  }
}

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    // Get token from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token required');
    }

    const token = authHeader.split(' ')[1];

    // Update password
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw new ApiError(400, error.message);
    }

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Reset password error:', error);
    throw new ApiError(500, 'Failed to reset password');
  }
}

export default {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};