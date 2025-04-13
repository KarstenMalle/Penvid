import { Request, Response } from 'express';
import currencyService, { SupportedCurrency } from '../services/currencyService';
import { ApiError } from '../middleware/errorMiddleware';
import logger from '../utils/logger';

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     summary: Get all supported currencies
 *     tags: [Currency]
 *     responses:
 *       200:
 *         description: List of supported currencies
 *       500:
 *         description: Server error
 */
export async function getSupportedCurrencies(req: Request, res: Response) {
  try {
    const currencies = currencyService.getSupportedCurrencies();
    res.status(200).json(currencies);
  } catch (error) {
    logger.error('Error in getSupportedCurrencies controller:', error);
    throw new ApiError(500, 'Failed to fetch supported currencies');
  }
}

/**
 * @swagger
 * /api/currencies/refresh:
 *   post:
 *     summary: Refresh currency rates (admin only)
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Currency rates refreshed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function refreshCurrencyRates(req: Request, res: Response) {
  try {
    // In a real app, you'd implement admin role check here
    const rates = await currencyService.refreshCurrencyRates();
    res.status(200).json({ message: 'Currency rates refreshed', rates });
  } catch (error) {
    logger.error('Error in refreshCurrencyRates controller:', error);
    throw new ApiError(500, 'Failed to refresh currency rates');
  }
}

/**
 * @swagger
 * /api/currencies/convert:
 *   post:
 *     summary: Convert an amount between currencies
 *     tags: [Currency]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - fromCurrency
 *               - toCurrency
 *             properties:
 *               amount:
 *                 type: number
 *               fromCurrency:
 *                 type: string
 *                 enum: [USD, DKK]
 *               toCurrency:
 *                 type: string
 *                 enum: [USD, DKK]
 *     responses:
 *       200:
 *         description: Converted amount
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
export async function convertAmount(req: Request, res: Response) {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (typeof amount !== 'number' || amount < 0) {
      throw new ApiError(400, 'Amount must be a positive number');
    }

    if (!Object.values(SupportedCurrency).includes(fromCurrency)) {
      throw new ApiError(400, `Invalid source currency. Supported currencies: ${Object.values(SupportedCurrency).join(', ')}`);
    }

    if (!Object.values(SupportedCurrency).includes(toCurrency)) {
      throw new ApiError(400, `Invalid target currency. Supported currencies: ${Object.values(SupportedCurrency).join(', ')}`);
    }

    const convertedAmount = await currencyService.convertCurrency(
      amount,
      fromCurrency as SupportedCurrency,
      toCurrency as SupportedCurrency
    );

    res.status(200).json({
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      convertedCurrency: toCurrency,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in convertAmount controller:', error);
    throw new ApiError(500, 'Failed to convert currency');
  }
}

export default {
  getSupportedCurrencies,
  refreshCurrencyRates,
  convertAmount,
};