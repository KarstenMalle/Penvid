// Updated LocalizationContext.tsx to properly use the TranslationService

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
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
import { CurrencyService } from '@/services/CurrencyService'
import { TranslationService } from '@/services/TranslationService'

interface FormatCurrencyOptions extends Intl.NumberFormatOptions {
  originalCurrency?: Currency
}

// Add type for profile preferences
interface ProfilePreferences {
  language_preference: string | null
  currency_preference: string | null
  country_preference: string | null
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

// Cache for currency conversions to avoid duplicate API calls
const conversionCache: Record<string, number> = {}

// Cache for translations to avoid duplicate API calls
const translationCache: Record<string, Record<string, any>> = {}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency)
  const [country, setCountryState] = useState<Country>(defaultCountry)
  const [translations, setTranslations] = useState<Record<string, any>>(initialTranslations)
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true)
  const [conversionRates, setConversionRates] = useState<Record<string, number>>({})
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const supabase = createClient()

  // Load translations when locale changes
  const loadTranslations = useCallback(async (currentLocale: Locale) => {
    setIsLoadingTranslations(true)
    console.log(`Loading translations for locale: ${currentLocale}`)

    try {
      const translationsData = await TranslationService.getTranslations(currentLocale)
      setTranslations(translationsData)
      // Update the cache in the service
      TranslationService.cache[currentLocale] = translationsData
    } catch (error) {
      console.error(`Error loading translations for ${currentLocale}:`, error)

      // If error with requested locale, try fallback
      if (currentLocale !== 'en') {
        try {
          console.log(`Falling back to English translations due to error`)
          const fallbackTranslations = await TranslationService.getTranslations('en')
          setTranslations(fallbackTranslations)
          // Update the cache in the service
          TranslationService.cache['en'] = fallbackTranslations
        } catch (fallbackError) {
          console.error('Error loading fallback translations:', fallbackError)
        }
      }
    } finally {
      setIsLoadingTranslations(false)
    }
  }, []) // Remove translations from dependencies

  // Load translations when locale changes
  useEffect(() => {
    loadTranslations(locale)
  }, [locale, loadTranslations])

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

      if (storedCurrency && Object.keys(currencyConfig).includes(storedCurrency)) {
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
            .select('language_preference, currency_preference, country_preference')
            .eq('id', user.id)
            .single()

          if (error) throw error

          if (data?.language_preference && Object.keys(languages).includes(data.language_preference)) {
            newLocale = data.language_preference as Locale
            setLocaleState(newLocale)
            localStorage.setItem('locale', data.language_preference)
          }

          if (data?.currency_preference && Object.keys(currencyConfig).includes(data.currency_preference)) {
            setCurrencyState(data.currency_preference as Currency)
            localStorage.setItem('currency', data.currency_preference)
          }

          if (data?.country_preference && Object.keys(countryConfig).includes(data.country_preference)) {
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

      // Load initial translations
      await loadTranslations(newLocale)
    }

    loadPreferences()
  }, [user, supabase, loadTranslations])

  // Function to refresh translations manually
  const refreshTranslations = async () => {
    TranslationService.clearCache()
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
    // Clear the cache to ensure we get fresh translations
    TranslationService.clearCache()
    await loadTranslations(newLocale)
  }

  // Function to change currency
  const setCurrency = async (newCurrency: Currency) => {
    // Update local state
    setCurrencyState(newCurrency)

    // Save to localStorage as fallback
    localStorage.setItem('currency', newCurrency)

    // If authenticated, save to database
    if (user) {
      try {
        // Update in profiles table (using profiles consistently)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ currency_preference: newCurrency })
          .eq('id', user.id)

        if (profileError) {
          console.error('Error updating profile currency:', profileError)
          toast.error('Failed to save currency preference')
          return
        }

        toast.success(`Currency changed to ${currencyConfig[newCurrency].name}`)

        // Refresh the page to ensure all data is displayed in the correct currency
        window.location.reload()
      } catch (error) {
        console.error('Error saving currency preference:', error)
        toast.error('Failed to save currency preference')
      }
    } else {
      // If no user, still refresh the page for currency update
      window.location.reload()
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

  // Translation function with proper typing
  const t = (key: string, params?: Record<string, any>): string => {
    // First try to get from local state
    const keys = key.split('.')
    let value: any = translations

    for (const k of keys) {
      if (!value || typeof value !== 'object') {
        break
      }
      value = value[k]
    }

    if (typeof value === 'string') {
      if (params) {
        return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
          return str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue))
        }, value)
      }
      return value
    }

    // If not found in local state, try the service cache
    return TranslationService.getTranslationSync(locale, key, params)
  }

  // Convert amount between currencies - non-async version that uses the cached rates
  const convertAmount = (
    amount: number,
    from: Currency = 'USD',
    to: Currency = currency
  ): number => {
    if (!amount || isNaN(amount)) return 0
    if (from === to) return amount

    // Check if we have this conversion in the cache
    const cacheKey = `${from}-${to}-${amount}`
    if (conversionCache[cacheKey] !== undefined) {
      return conversionCache[cacheKey]
    }

    // Perform conversion using rates if available
    if (Object.keys(conversionRates).length > 0) {
      let result = amount

      // Convert to USD first if not already USD
      if (from !== 'USD') {
        result = amount / (conversionRates[from] || 1.0)
      }

      // Convert from USD to target currency
      if (to !== 'USD') {
        result = result * (conversionRates[to] || 1.0)
      }

      // Cache the result
      conversionCache[cacheKey] = result
      return result
    }

    // Fallback conversion rates if API rates are not available
    const fallbackRates = {
      USD: 1.0,
      DKK: 6.9,
    }

    let result = amount

    // Convert to USD first if not already USD
    if (from !== 'USD') {
      result =
        amount / (fallbackRates[from as keyof typeof fallbackRates] || 1.0)
    }

    // Convert from USD to target currency
    if (to !== 'USD') {
      result = result * (fallbackRates[to as keyof typeof fallbackRates] || 1.0)
    }

    // Cache the result
    conversionCache[cacheKey] = result
    return result
  }

  // Format currency function
  const formatCurrency = (
    amount: number,
    options?: FormatCurrencyOptions
  ): string => {
    if (!amount || isNaN(amount)) return '0'

    const { originalCurrency = currency, ...formatOptions } = options || {}
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

    try {
      return new Intl.NumberFormat(config.locale, safeOptions).format(amount)
    } catch (error) {
      console.error('Error formatting currency:', error)
      // Fallback to basic formatting
      return currency === 'USD'
        ? `$${amount.toFixed(safeOptions.minimumFractionDigits)}`
        : `${amount.toFixed(safeOptions.minimumFractionDigits)} ${currency}`
    }
  }

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
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
    }),
    [
      locale,
      currency,
      country,
      translations,
      isLoadingTranslations,
      conversionRates,
    ]
  )

  return (
    <LocalizationContext.Provider value={contextValue}>
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
