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
  countries,
  Country,
  defaultCountry,
  countryConfig,
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
  country: Country
  setCountry: (country: Country) => Promise<void>
  t: (key: string) => string
  formatCurrency: (amount: number, options?: FormatCurrencyOptions) => string
  convertAmount: (amount: number, from?: Currency, to?: Currency) => number
  languages: typeof languages
  currencies: typeof currencyConfig
  countries: typeof countryConfig
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
)

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency)
  const [country, setCountryState] = useState<Country>(defaultCountry)
  const supabase = createClient()

  // Load exchange rates when component mounts
  useEffect(() => {
    fetchExchangeRates().catch(console.error)
  }, [])

  // Load user's language, currency, and country preferences
  useEffect(() => {
    async function loadPreferences() {
      // First check localStorage
      const storedLocale = localStorage.getItem('locale') as Locale | null
      const storedCurrency = localStorage.getItem('currency') as Currency | null
      const storedCountry = localStorage.getItem('country') as Country | null

      if (storedLocale && Object.keys(languages).includes(storedLocale)) {
        setLocaleState(storedLocale)
      }

      if (
        storedCurrency &&
        Object.keys(currencyConfig).includes(storedCurrency)
      ) {
        setCurrencyState(storedCurrency)
      }

      if (storedCountry && Object.keys(countryConfig).includes(storedCountry)) {
        setCountryState(storedCountry)
      }

      // If authenticated, check database
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select(
              'language_preference, currency_preference, country_preference'
            )
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

          if (
            data?.country_preference &&
            Object.keys(countryConfig).includes(data.country_preference)
          ) {
            setCountryState(data.country_preference as Country)
            localStorage.setItem('country', data.country_preference)
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

      if (!storedCountry) {
        // Try to match country to locale
        if (locale === 'da') {
          setCountryState('DK')
          localStorage.setItem('country', 'DK')
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

  // Function to change country
  const setCountry = async (newCountry: Country) => {
    // Update local state
    setCountryState(newCountry)

    // Save to localStorage
    localStorage.setItem('country', newCountry)

    // If authenticated, save to database
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ country_preference: newCountry })
          .eq('id', user.id)

        if (error) throw error

        // Optionally update currency and language based on country default settings
        const countrySettings = countryConfig[newCountry]

        // Ask user if they want to update currency to country's default
        if (currency !== countrySettings.defaultCurrency) {
          const shouldUpdateCurrency = confirm(
            t('settings.updateCurrencyToCountryDefault', {
              currency: currencyConfig[countrySettings.defaultCurrency].name,
            })
          )

          if (shouldUpdateCurrency) {
            await setCurrency(countrySettings.defaultCurrency)
          }
        }

        toast.success(`Country changed to ${countryConfig[newCountry].name}`)
      } catch (error) {
        console.error('Error saving country preference:', error)
        toast.error('Failed to save country preference')
      }
    }
  }

  // Translation function
  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.')
    let value = translations[locale]

    for (const k of keys) {
      if (value === undefined || value[k] === undefined) {
        console.warn(`Translation key not found: ${key}`)
        // Fallback to English or just return the key if not found
        if (locale !== 'en') {
          const englishValue = translations['en']
          let found = true
          let currentValue = englishValue

          for (const keyPart of keys) {
            if (currentValue && currentValue[keyPart]) {
              currentValue = currentValue[keyPart]
            } else {
              found = false
              break
            }
          }

          if (found) {
            value = currentValue
            break
          }
        }
        return key.split('.').pop() || key
      }
      value = value[k]
    }

    // Handle parameter substitution
    if (params && typeof value === 'string') {
      return Object.entries(params).reduce((str, [key, val]) => {
        return str.replace(new RegExp(`{${key}}`, 'g'), String(val))
      }, value)
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

    // Handle NaN, Infinity, etc.
    if (!isFinite(amount)) {
      return 'N/A'
    }

    // Default formatting options
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }

    // Validate and merge with provided options
    const safeOptions = { ...defaultOptions }

    if (formatOptions.minimumFractionDigits !== undefined) {
      safeOptions.minimumFractionDigits = Math.max(
        0,
        Math.min(20, formatOptions.minimumFractionDigits)
      )
    }

    if (formatOptions.maximumFractionDigits !== undefined) {
      safeOptions.maximumFractionDigits = Math.max(
        0,
        Math.min(20, formatOptions.maximumFractionDigits)
      )
    }

    // Ensure minimumFractionDigits <= maximumFractionDigits
    if (safeOptions.minimumFractionDigits > safeOptions.maximumFractionDigits) {
      safeOptions.minimumFractionDigits = safeOptions.maximumFractionDigits
    }

    // Apply other options
    if (formatOptions.style) {
      safeOptions.style = formatOptions.style
    }

    // Convert amount if needed
    const convertedAmount =
      originalCurrency === currency
        ? amount
        : convertAmount(amount, originalCurrency, currency)

    try {
      return new Intl.NumberFormat(config.locale, safeOptions).format(
        convertedAmount
      )
    } catch (error) {
      console.error('Error formatting currency:', error)
      // Fallback to basic formatting
      return currency === 'USD'
        ? `$${convertedAmount.toFixed(safeOptions.minimumFractionDigits)}`
        : `${convertedAmount.toFixed(safeOptions.minimumFractionDigits)} ${currency}`
    }
  }

  return (
    <LocalizationContext.Provider
      value={{
        locale,
        setLocale,
        currency,
        setCurrency,
        country,
        setCountry,
        t,
        formatCurrency,
        convertAmount,
        languages,
        currencies: currencyConfig,
        countries: countryConfig,
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
