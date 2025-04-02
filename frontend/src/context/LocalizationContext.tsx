// src/context/LocalizationContext.tsx - Updated with API integration

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
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
import { TranslationService } from '@/services/TranslationService'

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
  t: (key: string, params?: Record<string, any>) => string
  formatCurrency: (amount: number, options?: FormatCurrencyOptions) => string
  convertAmount: (amount: number, from?: Currency, to?: Currency) => number
  languages: typeof languages
  currencies: typeof currencyConfig
  countries: typeof countryConfig
  isLoadingTranslations: boolean
  refreshTranslations: () => Promise<void>
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
)

// Basic fallback translations for initial rendering
const initialTranslations = {
  common: {
    loading: 'Loading...',
    error: 'Error',
  },
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency)
  const [country, setCountryState] = useState<Country>(defaultCountry)
  const [translations, setTranslations] =
    useState<Record<string, any>>(initialTranslations)
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true)
  const supabase = createClient()

  // Load exchange rates when component mounts
  useEffect(() => {
    fetchExchangeRates().catch(console.error)
  }, [])

  // Load translations when locale changes
  const loadTranslations = useCallback(async (currentLocale: Locale) => {
    setIsLoadingTranslations(true)
    try {
      const translationsData =
        await TranslationService.getTranslations(currentLocale)
      setTranslations(translationsData)
    } catch (error) {
      console.error(`Error loading translations for ${currentLocale}:`, error)

      // If error with requested locale, try fallback
      if (currentLocale !== 'en') {
        try {
          const fallbackTranslations =
            await TranslationService.getTranslations('en')
          setTranslations(fallbackTranslations)
        } catch (fallbackError) {
          console.error('Error loading fallback translations:', fallbackError)
        }
      }
    } finally {
      setIsLoadingTranslations(false)
    }
  }, [])

  // Load user's language, currency, and country preferences
  useEffect(() => {
    async function loadPreferences() {
      // First check localStorage
      const storedLocale = localStorage.getItem('locale') as Locale | null
      const storedCurrency = localStorage.getItem('currency') as Currency | null
      const storedCountry = localStorage.getItem('country') as Country | null

      let newLocale = defaultLocale

      if (storedLocale && Object.keys(languages).includes(storedLocale)) {
        newLocale = storedLocale
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
            newLocale = data.language_preference as Locale
            setLocaleState(newLocale)
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
          newLocale = browserLang as Locale
          setLocaleState(browserLang)
          localStorage.setItem('locale', browserLang)
        }
      }

      if (!storedCurrency) {
        // Try to match currency to locale
        if (newLocale === 'da') {
          setCurrencyState('DKK')
          localStorage.setItem('currency', 'DKK')
        }
      }

      if (!storedCountry) {
        // Try to match country to locale
        if (newLocale === 'da') {
          setCountryState('DK')
          localStorage.setItem('country', 'DK')
        }
      }

      // Load translations for the determined locale
      await loadTranslations(newLocale)
    }

    loadPreferences()
  }, [user, supabase, loadTranslations])

  // Reload translations when locale changes
  useEffect(() => {
    loadTranslations(locale)
  }, [locale, loadTranslations])

  // Function to refresh translations manually
  const refreshTranslations = async () => {
    await loadTranslations(locale)
  }

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

    // Load translations for new locale
    await loadTranslations(newLocale)
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
  const t = (key: string, params?: Record<string, any>) => {
    // Split the key into path segments
    const keys = key.split('.')

    // Navigate through the translations object
    let value: any = translations
    for (const k of keys) {
      if (!value || typeof value !== 'object') {
        return key // Key path is invalid, return the key itself
      }

      value = value[k]

      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`)
        return key.split('.').pop() || key // Return the last part of the key if not found
      }
    }

    // If the value is not a string, or is empty, return the key
    if (typeof value !== 'string' || !value) {
      return key
    }

    // Replace parameters if provided
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        // For React elements, we need special handling
        if (React.isValidElement(paramValue)) {
          // Create parts by splitting on the parameter placeholder
          const parts = str.toString().split(new RegExp(`{${paramKey}}`, 'g'))

          // Interleave parts with the React element
          const result = parts.reduce((acc: any[], part, index) => {
            if (index === 0) return [part]
            return [...acc, paramValue, part]
          }, [])

          return result
        }

        return str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue))
      }, value)
    }

    return value
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
        isLoadingTranslations,
        refreshTranslations,
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
