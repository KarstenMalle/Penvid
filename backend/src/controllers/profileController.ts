import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  profileExists
} from '../services/userService';
import { ApiError } from '../middleware/errorMiddleware';
import { SupportedCurrency } from '../services/currencyService';
import logger from '../utils/logger';

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function getProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'User not authenticated');
    }

    const userId = req.user.id;
    logger.info(`Profile request for user ${userId}`);

    // First check if the profile exists
    const exists = await profileExists(userId);

    // If profile doesn't exist, create a new one with default values
    if (!exists) {
      logger.info(`No profile found for user ${userId}, creating a new one`);

      try {
        const newProfile = await createUserProfile(userId, {
          language_preference: 'en',
          currency_preference: SupportedCurrency.USD,
          country_preference: 'US',
        });

        logger.info(`Successfully created profile for user ${userId}`);
        return res.status(200).json(newProfile);
      } catch (createError) {
        logger.error(`Failed to create profile for user ${userId}:`, createError);
        throw new ApiError(500, 'Failed to create user profile');
      }
    }

    // Fetch the existing profile
    try {
      const profile = await getUserProfile(userId);

      if (!profile) {
        // This shouldn't happen since we checked existence, but just in case
        throw new ApiError(404, 'Profile not found');
      }

      return res.status(200).json(profile);
    } catch (fetchError) {
      logger.error(`Failed to fetch profile for user ${userId}:`, fetchError);
      throw new ApiError(500, 'Failed to fetch user profile');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getProfile controller:', error);
    throw new ApiError(500, 'Failed to process profile request');
  }
}

/**
 * @swagger
 * /api/profile:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               language_preference:
 *                 type: string
 *               currency_preference:
 *                 type: string
 *                 enum: [USD, DKK]
 *               country_preference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated profile
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'User not authenticated');
    }

    const userId = req.user.id;
    const updates = req.body;

    logger.info(`Profile update request for user ${userId}`, { updates });

    // Validate currency preference if provided
    if (updates.currency_preference &&
      !Object.values(SupportedCurrency).includes(updates.currency_preference)) {
      throw new ApiError(400, `Invalid currency. Supported currencies: ${Object.values(SupportedCurrency).join(', ')}`);
    }

    try {
      // This will create the profile if it doesn't exist
      const updatedProfile = await updateUserProfile(userId, updates);
      logger.info(`Successfully updated profile for user ${userId}`);
      return res.status(200).json(updatedProfile);
    } catch (updateError) {
      logger.error(`Failed to update profile for user ${userId}:`, updateError);
      throw new ApiError(500, 'Failed to update profile');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in updateProfile controller:', error);
    throw new ApiError(500, 'Failed to process profile update request');
  }
}

export default {
  getProfile,
  updateProfile,
};