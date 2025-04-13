import express from 'express';
import {
  getSupportedCurrencies,
  refreshCurrencyRates,
  convertAmount
} from '../controllers/currencyController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Currency
 *   description: Currency conversion and management
 */

// GET /api/currencies - Get supported currencies
router.get('/', getSupportedCurrencies);

// POST /api/currencies/refresh - Refresh currency rates (admin only)
router.post('/refresh', authenticate, refreshCurrencyRates);

// POST /api/currencies/convert - Convert between currencies
router.post('/convert', convertAmount);

export default router;