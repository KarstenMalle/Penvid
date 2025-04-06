// frontend/src/services/CurrencyService.ts
// Simplified service that only handles currency formatting, not conversion

import { Currency } from '@/i18n/config'

/**
 * Service for currency formatting only
 * No conversion logic - all conversion is handled by the backend
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
}
