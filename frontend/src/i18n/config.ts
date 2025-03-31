// frontend/src/i18n/config.ts
export const locales = ['en', 'da'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

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
