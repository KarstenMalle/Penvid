import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { ApiError } from '../middleware/errorMiddleware';
import supabase from '../config/supabase';
import logger from '../utils/logger';

/**
 * @swagger
 * /api/financial/sample-data:
 *   post:
 *     summary: Create sample financial data for a new user
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sample data created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function createSampleData(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'User not authenticated');
    }

    const userId = req.user.id;
    logger.info(`Creating sample data for user ${userId}`);

    // Check if user already has accounts
    const { data: existingAccounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (accountsError) {
      logger.error(`Error checking existing accounts: ${accountsError.message}`);
      throw new ApiError(500, 'Failed to check existing accounts');
    }

    // If accounts already exist, skip creating sample data
    if (existingAccounts && existingAccounts.length > 0) {
      logger.info(`User ${userId} already has accounts, skipping sample data creation`);
      return res.status(200).json({
        message: 'User already has financial data',
        created: false
      });
    }

    // Create checking account
    const { data: checkingAccount, error: checkingError } = await supabase
      .from('accounts')
      .insert([
        {
          user_id: userId,
          name: 'Checking',
          type: 'checking',
          balance: 2547.63,
          is_primary: true,
        },
      ])
      .select('*')
      .single();

    if (checkingError) {
      logger.error(`Error creating checking account: ${checkingError.message}`);
      throw new ApiError(500, 'Failed to create checking account');
    }

    // Create savings account
    const { error: savingsError } = await supabase
      .from('accounts')
      .insert([
        {
          user_id: userId,
          name: 'Savings',
          type: 'savings',
          balance: 8925.42,
          is_primary: false,
        },
      ]);

    if (savingsError) {
      logger.error(`Error creating savings account: ${savingsError.message}`);
      throw new ApiError(500, 'Failed to create savings account');
    }

    // Create investment account
    const { error: investmentError } = await supabase
      .from('accounts')
      .insert([
        {
          user_id: userId,
          name: 'Investments',
          type: 'investment',
          balance: 21340.88,
          is_primary: false,
        },
      ]);

    if (investmentError) {
      logger.error(`Error creating investment account: ${investmentError.message}`);
      throw new ApiError(500, 'Failed to create investment account');
    }

    // Create sample transactions
    if (checkingAccount) {
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            account_id: checkingAccount.id,
            user_id: userId,
            amount: -82.45,
            description: 'Grocery Store',
            category: 'Food',
            transaction_date: new Date().toISOString(),
          },
          {
            account_id: checkingAccount.id,
            user_id: userId,
            amount: 1250.0,
            description: 'Direct Deposit',
            category: 'Income',
            transaction_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          },
          {
            account_id: checkingAccount.id,
            user_id: userId,
            amount: -94.72,
            description: 'Electric Bill',
            category: 'Utilities',
            transaction_date: new Date(Date.now() - 172800000).toISOString(), // Two days ago
          },
        ]);

      if (transactionError) {
        logger.error(`Error creating transactions: ${transactionError.message}`);
        throw new ApiError(500, 'Failed to create transactions');
      }
    }

    // Create sample goals
    const { error: goalsError } = await supabase
      .from('goals')
      .insert([
        {
          user_id: userId,
          name: 'Vacation Fund',
          target_amount: 2500,
          current_amount: 1625,
          target_date: new Date('2025-06-30').toISOString(),
          is_completed: false,
        },
        {
          user_id: userId,
          name: 'Emergency Fund',
          target_amount: 10000,
          current_amount: 4000,
          target_date: null,
          is_completed: false,
        },
      ]);

    if (goalsError) {
      logger.error(`Error creating goals: ${goalsError.message}`);
      throw new ApiError(500, 'Failed to create goals');
    }

    logger.info(`Successfully created sample data for user ${userId}`);
    res.status(200).json({
      message: 'Sample data created successfully',
      created: true
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in createSampleData controller:', error);
    throw new ApiError(500, 'Failed to create sample data');
  }
}

export default {
  createSampleData,
};