// src/context/LocalizationContext.tsx

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from './AuthContext'
import {
  languages,
  Locale,
  defaultLocale,
  currencyConfig,
  Currency,
  defaultCurrency,
} from '@/i18n/config'
import toast from 'react-hot-toast'
import {
  fetchExchangeRates,
  convertCurrencySync,
} from '@/lib/currency-converter'

// Import translations
import enTranslations from '@/i18n/en.json'
import daTranslations from '@/i18n/da.json'

const translations = {
  en: enTranslations,
  da: daTranslations,
}

interface FormatCurrencyOptions extends Intl.NumberFormatOptions {
  originalCurrency?: Currency
}

type LocalizationContextType = {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  currency: Currency
  setCurrency: (currency: Currency) => Promise<void>
  t: (key: string) => string
  formatCurrency: (amount: number, options?: FormatCurrencyOptions) => string
  convertAmount: (amount: number, from?: Currency, to?: Currency) => number
  languages: typeof languages
  currencies: typeof currencyConfig
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
)

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency)
  const supabase = createClient()

  // Load exchange rates when component mounts
  useEffect(() => {
    fetchExchangeRates().catch(console.error)
  }, [])

  // Load user's language and currency preferences
  useEffect(() => {
    async function loadPreferences() {
      // First check localStorage
      const storedLocale = localStorage.getItem('locale') as Locale | null
      const storedCurrency = localStorage.getItem('currency') as Currency | null

      if (storedLocale && Object.keys(languages).includes(storedLocale)) {
        setLocaleState(storedLocale)
      }

      if (
        storedCurrency &&
        Object.keys(currencyConfig).includes(storedCurrency)
      ) {
        setCurrencyState(storedCurrency)
      }

      // If authenticated, check database
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('language_preference, currency_preference')
            .eq('id', user.id)
            .single()

          if (error) throw error

          if (
            data?.language_preference &&
            Object.keys(languages).includes(data.language_preference)
          ) {
            setLocaleState(data.language_preference as Locale)
            localStorage.setItem('locale', data.language_preference)
          }

          if (
            data?.currency_preference &&
            Object.keys(currencyConfig).includes(data.currency_preference)
          ) {
            setCurrencyState(data.currency_preference as Currency)
            localStorage.setItem('currency', data.currency_preference)
          }
        } catch (error) {
          console.error('Error loading preferences:', error)
        }
      }

      // If no preferences found, try to use browser settings
      if (!storedLocale) {
        const browserLang = navigator.language.split('-')[0] as Locale
        if (Object.keys(languages).includes(browserLang)) {
          setLocaleState(browserLang)
          localStorage.setItem('locale', browserLang)
        }
      }

      if (!storedCurrency) {
        // Try to match currency to locale
        if (locale === 'da') {
          setCurrencyState('DKK')
          localStorage.setItem('currency', 'DKK')
        }
      }
    }

    loadPreferences()
  }, [user, supabase, locale])

  // Function to change language
  const setLocale = async (newLocale: Locale) => {
    // Update local state
    setLocaleState(newLocale)

    // Save to localStorage
    localStorage.setItem('locale', newLocale)

    // If authenticated, save to database
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ language_preference: newLocale })
          .eq('id', user.id)

        if (error) throw error

        toast.success(`Language changed to ${languages[newLocale].name}`)
      } catch (error) {
        console.error('Error saving language preference:', error)
        toast.error('Failed to save language preference')
      }
    }
  }

  // Function to change currency
  const setCurrency = async (newCurrency: Currency) => {
    // Update local state
    setCurrencyState(newCurrency)

    // Save to localStorage
    localStorage.setItem('currency', newCurrency)

    // If authenticated, save to database
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ currency_preference: newCurrency })
          .eq('id', user.id)

        if (error) throw error

        toast.success(`Currency changed to ${currencyConfig[newCurrency].name}`)
      } catch (error) {
        console.error('Error saving currency preference:', error)
        toast.error('Failed to save currency preference')
      }
    }
  }

  // Translation function
  const t = (key: string) => {
    const keys = key.split('.')
    let value = translations[locale]

    for (const k of keys) {
      if (value === undefined || value[k] === undefined) {
        console.warn(`Translation key not found: ${key}`)
        // Fallback to English or just return the key if not found
        if (locale !== 'en') {
          const englishValue = translations['en']
          let found = true
          for (const keyPart of keys) {
            if (englishValue && englishValue[keyPart]) {
              value = englishValue[keyPart]
            } else {
              found = false
              break
            }
          }
          if (found) return value as string
        }
        return key.split('.').pop() || key
      }
      value = value[k]
    }

    return value as string
  }

  // Convert amount between currencies
  const convertAmount = (
    amount: number,
    from: Currency = 'USD',
    to: Currency = currency
  ): number => {
    return convertCurrencySync(amount, from, to)
  }

  // Format currency function
  const formatCurrency = (
    amount: number,
    options?: FormatCurrencyOptions
  ): string => {
    const { originalCurrency = 'USD', ...formatOptions } = options || {}
    const config = currencyConfig[currency]

    // Default formatting options
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }

    // Merge with provided options
    const formattingOptions = {
      ...defaultOptions,
      ...formatOptions,
    }

    // Convert amount if needed
    const convertedAmount =
      originalCurrency === currency
        ? amount
        : convertAmount(amount, originalCurrency, currency)

    return new Intl.NumberFormat(config.locale, formattingOptions).format(
      convertedAmount
    )
  }

  return (
    <LocalizationContext.Provider
      value={{
        locale,
        setLocale,
        currency,
        setCurrency,
        t,
        formatCurrency,
        convertAmount,
        languages,
        currencies: currencyConfig,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  )
}

export const useLocalization = () => {
  const context = useContext(LocalizationContext)
  if (context === undefined) {
    throw new Error(
      'useLocalization must be used within a LocalizationProvider'
    )
  }
  return context
}
