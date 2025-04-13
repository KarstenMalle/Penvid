import express from 'express';
import {
  getAccounts,
  getTransactions,
  getLoans,
  getInvestments,
  getGoals
} from '../controllers/financialController';
import { createSampleData } from '../controllers/sampleDataController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Financial
 *   description: Financial data management
 */

// All financial routes require authentication
router.use(authenticate);

// GET /api/financial/accounts - Get user accounts
router.get('/accounts', getAccounts);

// GET /api/financial/transactions - Get user transactions
router.get('/transactions', getTransactions);

// GET /api/financial/loans - Get user loans
router.get('/loans', getLoans);

// GET /api/financial/investments - Get user investments
router.get('/investments', getInvestments);

// GET /api/financial/goals - Get user goals
router.get('/goals', getGoals);

// POST /api/financial/sample-data - Create sample data for new users
router.post('/sample-data', createSampleData);

export default router;