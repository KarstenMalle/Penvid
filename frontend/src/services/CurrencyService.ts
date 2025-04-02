// frontend/src/services/CurrencyService.ts

import { createClient } from '@/lib/supabase-browser'
import { Currency } from '@/i18n/config'

interface ConversionResponse {
  original_amount: number
  original_currency: string
  converted_amount: number
  converted_currency: string
}

interface ExchangeRates {
  [currency: string]: number
}

// Cache exchange rates to minimize API calls
let cachedRates: ExchangeRates | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

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

    try {
      const supabase = createClient()

      // Call backend API
      const { data, error } = await supabase.functions.invoke(
        'currency/convert',
        {
          body: {
            amount,
            from_currency: fromCurrency,
            to_currency: toCurrency,
          },
        }
      )

      if (error) {
        console.error('Error converting currency:', error)
        throw new Error(`Failed to convert currency: ${error.message}`)
      }

      const response = data as ConversionResponse
      return response.converted_amount
    } catch (error) {
      console.error('Error in convertCurrency:', error)

      // Use fallback conversion if API call fails
      return this.fallbackConversion(amount, fromCurrency, toCurrency)
    }
  },

  /**
   * Get exchange rates
   */
  async getExchangeRates(): Promise<ExchangeRates> {
    // Return cached rates if still valid
    const now = Date.now()
    if (cachedRates && now - cacheTimestamp < CACHE_DURATION) {
      return cachedRates
    }

    try {
      const supabase = createClient()

      // Call backend API
      const { data, error } = await supabase.functions.invoke(
        'currency/rates',
        {
          body: {},
        }
      )

      if (error) {
        console.error('Error fetching exchange rates:', error)
        throw new Error(`Failed to fetch exchange rates: ${error.message}`)
      }

      // Update cache
      cachedRates = data.rates
      cacheTimestamp = now

      return data.rates
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
    // Use fallback rates
    const rates = this.getFallbackRates()

    // Convert to USD first if not already USD
    let amountInUsd = amount
    if (fromCurrency !== 'USD') {
      amountInUsd = amount / rates[fromCurrency]
    }

    // Convert from USD to target currency
    if (toCurrency === 'USD') {
      return amountInUsd
    }

    return amountInUsd * rates[toCurrency]
  },

  /**
   * Fallback exchange rates
   */
  getFallbackRates(): ExchangeRates {
    return {
      USD: 1,
      DKK: 6.8991310126, // As of March 2024
      // Add more fallback rates as needed
    }
  },
}
