import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import financialService from '../services/financialService';
import { ApiError } from '../middleware/errorMiddleware';
import logger from '../utils/logger';

/**
 * @swagger
 * /api/financial/accounts:
 *   get:
 *     summary: Get user accounts
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user accounts
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function getAccounts(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'User not authenticated');
    }

    const userId = req.user.id;
    const accounts = await financialService.getUserAccounts(userId);
    res.status(200).json(accounts);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getAccounts controller:', error);
    throw new ApiError(500, 'Failed to fetch accounts');
  }
}

/**
 * @swagger
 * /api/financial/transactions:
 *   get:
 *     summary: Get user transactions
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user transactions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function getTransactions(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'User not authenticated');
    }

    const userId = req.user.id;
    const transactions = await financialService.getUserTransactions(userId);
    res.status(200).json(transactions);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getTransactions controller:', error);
    throw new ApiError(500, 'Failed to fetch transactions');
  }
}

/**
 * @swagger
 * /api/financial/loans:
 *   get:
 *     summary: Get user loans
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user loans
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function getLoans(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'User not authenticated');
    }

    const userId = req.user.id;
    const loans = await financialService.getUserLoans(userId);
    res.status(200).json(loans);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getLoans controller:', error);
    throw new ApiError(500, 'Failed to fetch loans');
  }
}

/**
 * @swagger
 * /api/financial/investments:
 *   get:
 *     summary: Get user investments
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user investments
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function getInvestments(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'User not authenticated');
    }

    const userId = req.user.id;
    const investments = await financialService.getUserInvestments(userId);
    res.status(200).json(investments);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getInvestments controller:', error);
    throw new ApiError(500, 'Failed to fetch investments');
  }
}

/**
 * @swagger
 * /api/financial/goals:
 *   get:
 *     summary: Get user financial goals
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user goals
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function getGoals(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'User not authenticated');
    }

    const userId = req.user.id;
    const goals = await financialService.getUserGoals(userId);
    res.status(200).json(goals);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getGoals controller:', error);
    throw new ApiError(500, 'Failed to fetch goals');
  }
}

export default {
  getAccounts,
  getTransactions,
  getLoans,
  getInvestments,
  getGoals,
};