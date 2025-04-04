// frontend/src/services/CurrencyService.ts - Fixed to improve caching and reduce API calls

import { Currency } from '@/i18n/config'
import { ApiClient } from './ApiClient'

interface ConversionResponse {
  original_amount: number
  original_currency: string
  converted_amount: number
  converted_currency: string
}

interface ExchangeRateResponse {
  rates: Record<string, number>
}

// Cache for exchange rates to minimize API calls
let ratesCache: Record<string, number> | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Cache for specific currency conversions
const conversionCache: Map<string, number> = new Map()

/**
 * Service for currency conversion via backend API
 */
export const CurrencyService = {
  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    fromCurrency: Currency = 'USD',
    toCurrency: Currency = 'USD'
  ): Promise<number> {
    // No conversion needed if currencies are the same
    if (fromCurrency === toCurrency) {
      return amount
    }

    // Check if we have this conversion in the cache
    const cacheKey = `${fromCurrency}-${toCurrency}-${amount}`
    const cachedValue = conversionCache.get(cacheKey)
    if (cachedValue !== undefined) {
      return cachedValue
    }

    try {
      // Try to use exchange rates if already fetched
      if (ratesCache) {
        // Convert to USD first if needed
        let amountInUsd = amount
        if (fromCurrency !== 'USD') {
          amountInUsd = amount / (ratesCache[fromCurrency] || 1.0)
        }

        // Convert from USD to target currency
        const result =
          toCurrency === 'USD'
            ? amountInUsd
            : amountInUsd * (ratesCache[toCurrency] || 1.0)

        // Cache the result
        conversionCache.set(cacheKey, result)
        return result
      }

      // Call backend API if no rates cached
      const response = await ApiClient.post<any, ConversionResponse>(
        `/api/currency/convert`,
        {
          amount,
          from_currency: fromCurrency,
          to_currency: toCurrency,
        },
        {
          requiresAuth: false,
          requestId: `currency-convert-${fromCurrency}-${toCurrency}`,
        }
      )

      if (response.error || !response.data) {
        throw new Error('Currency conversion failed')
      }

      const result = response.data.converted_amount

      // Cache the result
      conversionCache.set(cacheKey, result)
      return result
    } catch (error) {
      console.error('Error in convertCurrency:', error)

      // Use fallback conversion if API call fails
      return this.fallbackConversion(amount, fromCurrency, toCurrency)
    }
  },

  /**
   * Get exchange rates - returns all rates with USD as base
   */
  async getExchangeRates(): Promise<Record<string, number>> {
    // Return cached rates if still valid
    const now = Date.now()
    if (ratesCache && now - cacheTimestamp < CACHE_DURATION) {
      return ratesCache
    }

    try {
      // Get rates from API
      const response = await ApiClient.get<ExchangeRateResponse>(
        '/api/currency/rates',
        {
          requiresAuth: false,
          requestId: 'get-exchange-rates',
        }
      )

      if (response.error || !response.data || !response.data.rates) {
        throw new Error('Failed to fetch exchange rates')
      }

      // Update cache
      ratesCache = response.data.rates
      cacheTimestamp = now

      return response.data.rates
    } catch (error) {
      console.error('Error in getExchangeRates:', error)

      // Return fallback rates
      return this.getFallbackRates()
    }
  },

  /**
   * Fallback currency conversion (used when API call fails)
   */
  fallbackConversion(
    amount: number,
    fromCurrency: Currency = 'USD',
    toCurrency: Currency = 'USD'
  ): number {
    // No conversion needed if currencies are the same
    if (fromCurrency === toCurrency) {
      return amount
    }

    // Use fallback rates
    const rates = this.getFallbackRates()

    // Convert to USD first if not already USD
    let amountInUsd = amount
    if (fromCurrency !== 'USD') {
      amountInUsd = amount / (rates[fromCurrency] || 1.0)
    }

    // Convert from USD to target currency
    if (toCurrency === 'USD') {
      return amountInUsd
    }

    return amountInUsd * (rates[toCurrency] || 1.0)
  },

  /**
   * Fallback exchange rates (as of April 2025)
   */
  getFallbackRates(): Record<string, number> {
    return {
      USD: 1.0,
      DKK: 6.9, // Danish Krone to USD
      EUR: 0.93, // Euro to USD
      GBP: 0.78, // British Pound to USD
      JPY: 109.5, // Japanese Yen to USD
      CAD: 1.34, // Canadian Dollar to USD
      AUD: 1.48, // Australian Dollar to USD
    }
  },

  /**
   * Clear the rate cache to force a refresh
   */
  clearCache(): void {
    ratesCache = null
    cacheTimestamp = 0
    conversionCache.clear()
  },
}
