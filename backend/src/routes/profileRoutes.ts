import express from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile management
 */

// All profile routes require authentication
router.use(authenticate);

// GET /api/profile - Get user profile
router.get('/', getProfile);

// PATCH /api/profile - Update user profile
router.patch('/', updateProfile);

export default router;