// frontend/src/lib/currency-formatter.ts
import { currencyConfig, Currency, defaultCurrency } from '@/i18n/config'

export class CurrencyUtil {
  private static instance: CurrencyUtil
  private currentCurrency: Currency = defaultCurrency

  private constructor() {
    // Try to get currency from localStorage
    const storedCurrency = localStorage.getItem('currency') as Currency
    if (
      storedCurrency &&
      Object.keys(currencyConfig).includes(storedCurrency)
    ) {
      this.currentCurrency = storedCurrency
    }
  }

  public static getInstance(): CurrencyUtil {
    if (!CurrencyUtil.instance) {
      CurrencyUtil.instance = new CurrencyUtil()
    }

    return CurrencyUtil.instance
  }

  public setCurrency(currency: Currency): void {
    this.currentCurrency = currency
  }

  public formatCurrency(
    amount: number,
    options?: Intl.NumberFormatOptions
  ): string {
    const config = currencyConfig[this.currentCurrency]

    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: this.currentCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }

    const formattingOptions = {
      ...defaultOptions,
      ...options,
    }

    return new Intl.NumberFormat(config.locale, formattingOptions).format(
      amount
    )
  }
}

// Usage in non-React code:
export const formatCurrency = (
  amount: number,
  options?: Intl.NumberFormatOptions
): string => {
  return CurrencyUtil.getInstance().formatCurrency(amount, options)
}
