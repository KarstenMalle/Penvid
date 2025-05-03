// frontend/src/context/LocalizationContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react'
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
import { createClient } from '@/lib/supabase-browser'

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

// Cache for currency conversions to avoid duplicate API calls
const conversionCache: Record<string, number> = {}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading: authLoading, profile } = useAuth()
  const [translations, setTranslations] =
    useState<Record<string, any>>(initialTranslations)
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true)
  const [conversionRates, setConversionRates] = useState<
    Record<string, number>
  >({})
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const profileLoaded = useRef<boolean>(false)
  const supabase = createClient()

  // State for locale, currency, and country with defaults from local storage
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('locale') as Locale | null
      return storedLocale || defaultLocale
    }
    return defaultLocale
  })

  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      const storedCurrency = localStorage.getItem('currency') as Currency | null
      return storedCurrency || defaultCurrency
    }
    return defaultCurrency
  })

  const [country, setCountryState] = useState<Country>(() => {
    if (typeof window !== 'undefined') {
      const storedCountry = localStorage.getItem('country') as Country | null
      return storedCountry || defaultCountry
    }
    return defaultCountry
  })

  // Use profile preferences when available
  useEffect(() => {
    const loadPreferencesFromProfile = () => {
      // Only load from profile once per session and when profile is available
      if (
        !authLoading &&
        isAuthenticated &&
        profile &&
        !profileLoaded.current
      ) {
        console.log('Loading preferences from profile:', profile)

        // Get language preference from profile
        if (profile.language_preference) {
          const profileLocale = profile.language_preference as Locale
          setLocaleState(profileLocale)
          localStorage.setItem('locale', profileLocale)
        }

        // Get currency preference from profile
        if (profile.currency_preference) {
          const profileCurrency = profile.currency_preference as Currency
          setCurrencyState(profileCurrency)
          localStorage.setItem('currency', profileCurrency)
        }

        // Get country preference from profile
        if (profile.country_preference) {
          const profileCountry = profile.country_preference as Country
          setCountryState(profileCountry)
          localStorage.setItem('country', profileCountry)
        }

        profileLoaded.current = true
      }
    }

    loadPreferencesFromProfile()
  }, [isAuthenticated, authLoading, profile])

  // Load translations when locale changes
  const loadTranslations = useCallback(async (currentLocale: Locale) => {
    setIsLoadingTranslations(true)
    console.log(`Loading translations for locale: ${currentLocale}`)

    try {
      // Force a refresh of the translations when explicitly loading
      const translationsData = await TranslationService.getTranslations(
        currentLocale,
        true
      )

      // Log what we received to help debug
      console.log(`Received translations for ${currentLocale}:`, {
        hasLoans: !!translationsData.loans,
        namespaces: Object.keys(translationsData),
        loanKeys: translationsData.loans
          ? Object.keys(translationsData.loans).slice(0, 5)
          : [],
      })

      setTranslations(translationsData)
    } catch (error) {
      console.error(`Error loading translations for ${currentLocale}:`, error)

      // If error with requested locale, try fallback
      if (currentLocale !== 'en') {
        try {
          console.log(`Falling back to English translations due to error`)
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

  // Load currency conversion rates when currency changes
  const loadConversionRates = useCallback(async () => {
    if (isLoadingRates) return

    setIsLoadingRates(true)
    try {
      // Get exchange rates for current currency
      const rates = await CurrencyService.getExchangeRates()
      setConversionRates(rates || {})

      // Reset the conversion cache when rates change
      Object.keys(conversionCache).forEach((key) => {
        delete conversionCache[key]
      })
    } catch (error) {
      console.error('Error loading conversion rates:', error)
    } finally {
      setIsLoadingRates(false)
    }
  }, [isLoadingRates])

  // Reload translations when locale changes
  useEffect(() => {
    loadTranslations(locale)
  }, [locale, loadTranslations])

  // Load conversion rates when currency changes
  useEffect(() => {
    loadConversionRates()
  }, [currency, loadConversionRates])

  // Function to refresh translations manually
  const refreshTranslations = async () => {
    TranslationService.clearCache() // Clear the cache to force a fresh load
    await loadTranslations(locale)
  }

  // Update profile in Supabase directly
  const updateProfilePreferences = async (
    updates: Partial<{
      language: Locale
      currency: Currency
      country: Country
      theme?: string
    }>
  ) => {
    if (!isAuthenticated || !user) return false

    try {
      // Create the update object with the correct column names
      const updateData: any = {}

      if (updates.language) {
        updateData.language_preference = updates.language
      }

      if (updates.currency) {
        updateData.currency_preference = updates.currency
      }

      if (updates.country) {
        updateData.country_preference = updates.country
      }

      if (updates.theme) {
        updateData.theme_preference = updates.theme
      }

      // Always include updated timestamp
      updateData.updated_at = new Date().toISOString()

      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile preferences:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating profile preferences:', error)
      return false
    }
  }

  // Function to change language - update profile and local state
  const setLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return

    // Update local state first for immediate UI response
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)

    // Update profile if authenticated
    if (isAuthenticated && user) {
      const success = await updateProfilePreferences({ language: newLocale })
      if (!success) {
        toast.error('Failed to update language preference on server')
      }
    }

    toast.success(`Language changed to ${languages[newLocale].name}`)

    // Load translations for new locale
    TranslationService.clearCache()
    await loadTranslations(newLocale)
  }

  // Function to change currency - update profile and local state
  const setCurrency = async (newCurrency: Currency) => {
    if (newCurrency === currency) return

    // Update local state first for immediate UI response
    setCurrencyState(newCurrency)
    localStorage.setItem('currency', newCurrency)

    // Update profile if authenticated
    if (isAuthenticated && user) {
      const success = await updateProfilePreferences({ currency: newCurrency })
      if (!success) {
        toast.error('Failed to update currency preference on server')
      }
    }

    toast.success(`Currency changed to ${currencyConfig[newCurrency].name}`)
  }

  // Function to change country - update profile and local state
  const setCountry = async (newCountry: Country) => {
    if (newCountry === country) return

    // Update local state first for immediate UI response
    setCountryState(newCountry)
    localStorage.setItem('country', newCountry)

    // Update profile if authenticated
    if (isAuthenticated && user) {
      const success = await updateProfilePreferences({ country: newCountry })
      if (!success) {
        toast.error('Failed to update country preference on server')
      }
    }

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
  }

  // Translation function - improved to better handle missing translations
  const t = (key: string, params?: Record<string, any>) => {
    // Short circuit for empty key
    if (!key) return ''

    // Split the key into path segments
    const keys = key.split('.')

    // Navigate through the translations object
    let value: any = translations
    for (const k of keys) {
      if (!value || typeof value !== 'object') {
        // Use TranslationService's sync method to get a better fallback
        return TranslationService.getTranslationSync(locale, key, params)
      }

      value = value[k]

      if (value === undefined) {
        // Use TranslationService's sync method for better fallbacks
        return TranslationService.getTranslationSync(locale, key, params)
      }
    }

    // If the value is not a string, or is empty, use TranslationService
    if (typeof value !== 'string' || !value) {
      return TranslationService.getTranslationSync(locale, key, params)
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

    // Convert amount if needed - using the synchronous version
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
