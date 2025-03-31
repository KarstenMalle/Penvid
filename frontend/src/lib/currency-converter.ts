// frontend/src/lib/currency-converter.ts
import { Currency } from '@/i18n/config'

// Conversion rates (as of 2023 - you might want to use an API for real-time rates)
const CONVERSION_RATES: Record<Currency, Record<Currency, number>> = {
  USD: {
    USD: 1,
    DKK: 6.85, // 1 USD = 6.85 DKK (approximate)
  },
  DKK: {
    USD: 0.146, // 1 DKK = 0.146 USD (approximate)
    DKK: 1,
  },
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount

  const rate = CONVERSION_RATES[from][to]
  return amount * rate
}
