import axios from 'axios';
import NodeCache from 'node-cache';
import logger from '../utils/logger';

// Set up cache with TTL of 24 hours (86400 seconds)
const currencyCache = new NodeCache({ stdTTL: 86400 });

// The currencies we currently support
export enum SupportedCurrency {
  USD = 'USD',
  DKK = 'DKK',
}

// The base currency used across the system (all conversions will be to/from this)
export const BASE_CURRENCY = SupportedCurrency.USD;

// Interface for currency rates
interface CurrencyRates {
  [currency: string]: number;
}

/**
 * Fetches latest currency conversion rates from an external API
 * This could be replaced with a paid API service for production
 */
async function fetchLatestRates(): Promise<CurrencyRates> {
  try {
    // For this example, we're using the free exchangerate-api.com service
    // In production, you might want to use a more reliable paid service
    const response = await axios.get('https://open.er-api.com/v6/latest/USD');

    if (response.data && response.data.rates) {
      logger.info('Successfully fetched currency rates');
      return response.data.rates;
    }
    throw new Error('Invalid response format from currency API');
  } catch (error) {
    logger.error('Failed to fetch currency rates:', error);
    // If API fails, return a fallback with hardcoded rates
    // This ensures the application can continue to function
    return {
      [SupportedCurrency.USD]: 1,
      [SupportedCurrency.DKK]: 6.8, // Fallback approximate value
    };
  }
}

/**
 * Get currency rates, from cache if possible, otherwise fetch fresh data
 */
async function getCurrencyRates(): Promise<CurrencyRates> {
  const cacheKey = 'currencyRates';
  const cachedRates = currencyCache.get<CurrencyRates>(cacheKey);

  if (cachedRates) {
    return cachedRates;
  }

  const freshRates = await fetchLatestRates();
  currencyCache.set(cacheKey, freshRates);
  return freshRates;
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<number> {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getCurrencyRates();

  // Convert from source currency to USD (if not already USD)
  let amountInUSD = amount;
  if (fromCurrency !== SupportedCurrency.USD) {
    amountInUSD = amount / rates[fromCurrency];
  }

  // Convert from USD to target currency (if not USD)
  if (toCurrency === SupportedCurrency.USD) {
    return parseFloat(amountInUSD.toFixed(2));
  }

  const convertedAmount = amountInUSD * rates[toCurrency];
  return parseFloat(convertedAmount.toFixed(2));
}

/**
 * Force refresh the currency rates cache
 */
export async function refreshCurrencyRates(): Promise<CurrencyRates> {
  const cacheKey = 'currencyRates';
  const freshRates = await fetchLatestRates();
  currencyCache.set(cacheKey, freshRates);
  return freshRates;
}

/**
 * Get the list of supported currencies
 */
export function getSupportedCurrencies(): string[] {
  return Object.values(SupportedCurrency);
}

export default {
  convertCurrency,
  refreshCurrencyRates,
  getSupportedCurrencies,
};