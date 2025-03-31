// src/i18n/config.ts

export const locales = ['en', 'da'] as const
export type Locale = (typeof locales)[number]

export const currencies = ['USD', 'DKK'] as const
export type Currency = (typeof currencies)[number]

export const countries = ['US', 'DK'] as const
export type Country = (typeof countries)[number]

export const defaultLocale: Locale = 'en'
export const defaultCurrency: Currency = 'USD'
export const defaultCountry: Country = 'US'

export const languages = {
  en: {
    name: 'English',
    flag: '🇬🇧',
    displayName: 'English',
  },
  da: {
    name: 'Dansk',
    flag: '🇩🇰',
    displayName: 'Danish',
  },
}

export const currencyConfig = {
  USD: {
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    locale: 'en-US',
    decimal: '.',
    thousands: ',',
    displayName: 'USD ($)',
  },
  DKK: {
    symbol: 'kr',
    name: 'Danish Krone',
    flag: '🇩🇰',
    locale: 'da-DK',
    decimal: ',',
    thousands: '.',
    displayName: 'DKK (kr)',
  },
}

export const countryConfig = {
  US: {
    name: 'United States',
    flag: '🇺🇸',
    displayName: 'United States',
    defaultCurrency: 'USD' as Currency,
    defaultLocale: 'en' as Locale,
    rules: {
      mortgageInterestDeductible: true,
      studentLoanInterestDeductible: true,
      maxMortgageInterestDeduction: 750000, // $750,000 mortgage debt cap for interest deduction
      maxStudentLoanInterestDeduction: 2500, // $2,500 per year
    },
  },
  DK: {
    name: 'Denmark',
    flag: '🇩🇰',
    displayName: 'Danmark',
    defaultCurrency: 'DKK' as Currency,
    defaultLocale: 'da' as Locale,
    rules: {
      mortgageInterestDeductible: true,
      studentLoanInterestDeductible: false,
      maxMortgageInterestDeduction: null, // No specific cap in Denmark
      mortgageInterestDeductionRate: 0.33, // 33% deduction rate
    },
  },
}
