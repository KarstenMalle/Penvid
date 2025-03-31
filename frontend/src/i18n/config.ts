// frontend/src/i18n/config.ts
export const locales = ['en', 'da'] as const
export type Locale = (typeof locales)[number]

export const currencies = ['USD', 'DKK'] as const
export type Currency = (typeof currencies)[number]

export const defaultLocale: Locale = 'en'
export const defaultCurrency: Currency = 'USD'

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
