// src/lib/currency-converter.ts

import { Currency } from '@/i18n/config'

// Default fallback rates (as of March 2025)
const DEFAULT_RATES = {
  USD: 1,
  DKK: 6.8991310126, // 1 USD = 6.90 DKK
}

// Cache the rates and timestamp
let cachedRates: Record<Currency, number> = { ...DEFAULT_RATES }
let lastFetchTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export async function fetchExchangeRates(): Promise<Record<Currency, number>> {
  try {
    // Check if cache is still valid
    const now = Date.now()
    if (now - lastFetchTime < CACHE_DURATION) {
      return cachedRates
    }

    // Fetch new rates
    const response = await fetch('https://api.fxratesapi.com/latest')

    if (!response.ok) {
      console.error(
        'Failed to fetch exchange rates from API:',
        response.statusText
      )
      return DEFAULT_RATES
    }

    const data = await response.json()

    if (data.success) {
      // Update cached rates and timestamp
      cachedRates = {
        USD: 1, // Base currency
        DKK: data.rates.DKK,
      }
      lastFetchTime = now

      console.log('Updated exchange rates:', cachedRates)
      return cachedRates
    } else {
      console.error('Failed to fetch exchange rates:', data)
      return DEFAULT_RATES
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    return DEFAULT_RATES
  }
}

export async function convertCurrency(
  amount: number,
  from: Currency = 'USD',
  to: Currency = 'USD'
): Promise<number> {
  if (from === to) return amount

  // Get latest rates
  const rates = await fetchExchangeRates()

  if (from === 'USD') {
    // Direct conversion from USD to target
    return amount * rates[to]
  } else if (to === 'USD') {
    // Convert to USD
    return amount / rates[from]
  } else {
    // Convert via USD as base currency
    const amountInUSD = amount / rates[from]
    return amountInUSD * rates[to]
  }
}

// Synchronous version for when we can't await
export function convertCurrencySync(
  amount: number,
  from: Currency = 'USD',
  to: Currency = 'USD'
): number {
  if (from === to) return amount

  // Use cached rates
  if (from === 'USD') {
    return amount * cachedRates[to]
  } else if (to === 'USD') {
    return amount / cachedRates[from]
  } else {
    const amountInUSD = amount / cachedRates[from]
    return amountInUSD * cachedRates[to]
  }
}
