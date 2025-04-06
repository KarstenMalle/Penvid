// frontend/src/services/CurrencyService.ts - Updated to rely on backend conversion

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

/**
 * Service for currency management
 * Now primarily used for display formatting, not conversion
 * (Conversion is handled by the backend currency middleware)
 */
export const CurrencyService = {
  /**
   * Format a number as currency
   */
  formatCurrency(
    amount: number,
    currency: Currency = 'USD',
    minimumFractionDigits: number = 0,
    maximumFractionDigits: number = 0
  ): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '—'
    }

    try {
      // Use built-in Intl.NumberFormat for consistent formatting
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount)
    } catch (error) {
      console.error('Error formatting currency:', error)

      // Fallback formatting
      if (currency === 'USD') {
        return `$${amount.toFixed(maximumFractionDigits)}`
      } else if (currency === 'DKK') {
        return `kr ${amount.toFixed(maximumFractionDigits)}`
      } else {
        return `${amount.toFixed(maximumFractionDigits)} ${currency}`
      }
    }
  },

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: Currency = 'USD'): string {
    switch (currency) {
      case 'USD':
        return '$'
      case 'DKK':
        return 'kr'
      case 'EUR':
        return '€'
      default:
        return currency
    }
  },

  /**
   * Get current user currency preference
   */
  getCurrentCurrency(): Currency {
    return (localStorage.getItem('currency') as Currency) || 'USD'
  },

  /**
   * Set user currency preference
   */
  setCurrentCurrency(currency: Currency): void {
    localStorage.setItem('currency', currency)

    // Reload the page to refresh all data with the new currency
    window.location.reload()
  },

  /**
   * DEPRECATED - Use only for display purposes, not calculation
   * (All calculations should now use data from APIs that's already converted)
   *
   * Convert amount between currencies using approximate rates
   * This is only for UI display when API data isn't available yet
   */
  approximateConversion(
    amount: number,
    fromCurrency: Currency = 'USD',
    toCurrency: Currency = this.getCurrentCurrency()
  ): number {
    if (!amount || isNaN(amount) || fromCurrency === toCurrency) return amount

    // Approximate conversion rates (as of 2025)
    const rates = {
      USD: 1.0,
      DKK: 6.9, // Danish Krone to USD
      EUR: 0.93, // Euro to USD
    }

    // Convert to USD first if not already
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
}
