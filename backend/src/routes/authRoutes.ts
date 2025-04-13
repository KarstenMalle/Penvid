import express from 'express';
import {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication management
 */

// POST /api/auth/register - Register a new user
router.post('/register', register);

// POST /api/auth/login - Login a user
router.post('/login', login);

// POST /api/auth/logout - Logout a user
router.post('/logout', authenticate, logout);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', authenticate, resetPassword);

export default router;