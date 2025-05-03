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
import { TranslationService } from '@/services/TranslationService'
import { ApiClient } from '@/services/ApiClient'
import toast from 'react-hot-toast'

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

const PREFS_STORAGE_KEY = 'user_preferences'

// Basic fallback translations for initial rendering
const initialTranslations = {
  common: {
    loading: 'Loading...',
    error: 'Error',
  },
}

// Cache for currency conversions to avoid duplicate API calls
const conversionCache: Record<string, number> = {}
const conversionRateCache: Record<string, Record<string, number>> = {
  USD: { USD: 1.0, DKK: 6.9 },
}

// Default exchange rates when nothing else is available
const fallbackRates = {
  USD: 1.0,
  DKK: 6.9,
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading: authLoading, profile } = useAuth()
  const [translations, setTranslations] =
    useState<Record<string, any>>(initialTranslations)
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true)
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false)

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

  // Load directly from storage first to avoid blank screen
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        // Load preferences from storage
        const storedPrefs = localStorage.getItem(PREFS_STORAGE_KEY)
        if (storedPrefs) {
          console.log('Loading preferences from local storage')
          const prefs = JSON.parse(storedPrefs)
          if (
            prefs.language &&
            Object.keys(languages).includes(prefs.language)
          ) {
            setLocaleState(prefs.language)
          }
          if (
            prefs.currency &&
            Object.keys(currencyConfig).includes(prefs.currency)
          ) {
            setCurrencyState(prefs.currency)
          }
          if (
            prefs.country &&
            Object.keys(countryConfig).includes(prefs.country)
          ) {
            setCountryState(prefs.country)
          }
        }
      } catch (error) {
        console.error('Error loading preferences from storage:', error)
      }
    }

    loadFromStorage()
  }, [])

  // Use profile preferences when available
  useEffect(() => {
    const loadPreferencesFromProfile = async () => {
      // Only try to load from profile when auth is settled and we're authenticated
      if (!authLoading && isAuthenticated && profile) {
        console.log('Loading preferences from profile:', profile)
        let prefsChanged = false

        try {
          // Get language preference from profile
          if (profile.language_preference) {
            const profileLocale = profile.language_preference as Locale
            if (
              profileLocale &&
              Object.keys(languages).includes(profileLocale)
            ) {
              setLocaleState(profileLocale)
              localStorage.setItem('locale', profileLocale)
              prefsChanged = true
            }
          }

          // Get currency preference from profile
          if (profile.currency_preference) {
            const profileCurrency = profile.currency_preference as Currency
            if (
              profileCurrency &&
              Object.keys(currencyConfig).includes(profileCurrency)
            ) {
              setCurrencyState(profileCurrency)
              localStorage.setItem('currency', profileCurrency)
              prefsChanged = true
            }
          }

          // Get country preference from profile
          if (profile.country_preference) {
            const profileCountry = profile.country_preference as Country
            if (
              profileCountry &&
              Object.keys(countryConfig).includes(profileCountry)
            ) {
              setCountryState(profileCountry)
              localStorage.setItem('country', profileCountry)
              prefsChanged = true
            }
          }

          if (prefsChanged) {
            console.log('Preferences updated from profile')

            // Also update the user_preferences in localStorage
            try {
              const newPrefs = {
                language: profile.language_preference || defaultLocale,
                currency: profile.currency_preference || defaultCurrency,
                country: profile.country_preference || defaultCountry,
                theme: profile.theme_preference || 'light',
              }
              localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(newPrefs))
            } catch (error) {
              console.error(
                'Error saving updated preferences to localStorage:',
                error
              )
            }
          }
        } catch (error) {
          console.error('Error loading preferences from profile:', error)
        }
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

      console.log(`Received translations for ${currentLocale}:`, {
        hasLoans: !!translationsData.loans,
        namespaces: Object.keys(translationsData),
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

  // Load currency conversion rates
  const fetchExchangeRates = useCallback(async () => {
    console.log('Fetching exchange rates')

    try {
      // Only call API if we're authenticated
      if (isAuthenticated && user) {
        const response = await ApiClient.get('/api/currency/rates', {
          requiresAuth: true,
          cache: {
            enabled: true,
            ttl: 24 * 60 * 60 * 1000, // 24 hours
          },
          requestId: 'get-exchange-rates',
        })

        if (response.success && response.data?.rates) {
          console.log('Received exchange rates:', response.data.rates)
          conversionRateCache['USD'] = response.data.rates

          // Reset conversion cache when rates change
          Object.keys(conversionCache).forEach((key) => {
            delete conversionCache[key]
          })
        } else {
          console.warn('Failed to fetch exchange rates, using fallback')
        }
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
    }
  }, [isAuthenticated, user])

  // Reload translations when locale changes
  useEffect(() => {
    loadTranslations(locale)
  }, [locale, loadTranslations])

  // Load conversion rates when currency changes or auth status changes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchExchangeRates()
    }
  }, [currency, isAuthenticated, authLoading, fetchExchangeRates])

  // Function to refresh translations manually
  const refreshTranslations = async () => {
    TranslationService.clearCache() // Clear the cache to force a fresh load
    await loadTranslations(locale)
  }

  // Function to change language - update profile and local state
  const setLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return

    // Update local state first for immediate UI response
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)

    // Update user_preferences in localStorage
    try {
      const storedPrefs = localStorage.getItem(PREFS_STORAGE_KEY)
      const prefs = storedPrefs ? JSON.parse(storedPrefs) : {}
      prefs.language = newLocale
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
    } catch (error) {
      console.error('Error updating localStorage preferences:', error)
    }

    // Update profile if authenticated
    if (isAuthenticated && user) {
      setIsUpdatingPreferences(true)
      try {
        const response = await ApiClient.put(
          `/api/user/${user.id}/preferences`,
          { language: newLocale },
          { requestId: 'update-language' }
        )

        if (!response.success) {
          console.error('Error updating language preference:', response.error)
          toast.error('Failed to update language preference on server')
        } else {
          toast.success(`Language changed to ${languages[newLocale].name}`)
        }
      } catch (error) {
        console.error('Error updating language:', error)
        toast.error('Failed to update language preference')
      } finally {
        setIsUpdatingPreferences(false)
      }
    } else {
      toast.success(`Language changed to ${languages[newLocale].name}`)
    }

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

    // Update user_preferences in localStorage
    try {
      const storedPrefs = localStorage.getItem(PREFS_STORAGE_KEY)
      const prefs = storedPrefs ? JSON.parse(storedPrefs) : {}
      prefs.currency = newCurrency
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
    } catch (error) {
      console.error('Error updating localStorage preferences:', error)
    }

    // Update profile if authenticated
    if (isAuthenticated && user) {
      setIsUpdatingPreferences(true)
      try {
        const response = await ApiClient.put(
          `/api/user/${user.id}/preferences`,
          { currency: newCurrency },
          { requestId: 'update-currency' }
        )

        if (!response.success) {
          console.error('Error updating currency preference:', response.error)
          toast.error('Failed to update currency preference on server')
        } else {
          toast.success(
            `Currency changed to ${currencyConfig[newCurrency].name}`
          )
        }
      } catch (error) {
        console.error('Error updating currency preference:', error)
        toast.error('Failed to update currency preference')
      } finally {
        setIsUpdatingPreferences(false)
      }
    } else {
      // Not authenticated, just show success for local change
      toast.success(`Currency changed to ${currencyConfig[newCurrency].name}`)
    }
  }

  // Function to change country - update profile and local state
  const setCountry = async (newCountry: Country) => {
    if (newCountry === country) return

    // Update local state first for immediate UI response
    setCountryState(newCountry)
    localStorage.setItem('country', newCountry)

    // Update user_preferences in localStorage
    try {
      const storedPrefs = localStorage.getItem(PREFS_STORAGE_KEY)
      const prefs = storedPrefs ? JSON.parse(storedPrefs) : {}
      prefs.country = newCountry
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
    } catch (error) {
      console.error('Error updating localStorage preferences:', error)
    }

    // Update profile if authenticated
    if (isAuthenticated && user) {
      setIsUpdatingPreferences(true)
      try {
        const response = await ApiClient.put(
          `/api/user/${user.id}/preferences`,
          { country: newCountry },
          { requestId: 'update-country' }
        )

        if (!response.success) {
          console.error('Error updating country preference:', response.error)
          toast.error('Failed to update country preference on server')
        } else {
          // Optionally update currency and language based on country default settings
          const countrySettings = countryConfig[newCountry]

          // Ask user if they want to update currency to country's default
          if (currency !== countrySettings.defaultCurrency) {
            const shouldUpdateCurrency = window.confirm(
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
      } catch (error) {
        console.error('Error updating country:', error)
        toast.error('Failed to update country preference')
      } finally {
        setIsUpdatingPreferences(false)
      }
    } else {
      toast.success(`Country changed to ${countryConfig[newCountry].name}`)
    }
  }

  // Translation function - improved to handle missing translations
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

  // Convert amount between currencies using the cached rates
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

    // Use rates if available
    let result = amount
    const usdRates = conversionRateCache['USD'] || fallbackRates

    // Convert to USD first
    if (from !== 'USD') {
      result = amount / (usdRates[from] || 1.0)
    }

    // Convert from USD to target
    if (to !== 'USD') {
      result = result * (usdRates[to] || 1.0)
    }

    // Cache result
    conversionCache[cacheKey] = result
    return result
  }

  // Format currency with appropriate options
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
    [locale, currency, country, translations, isLoadingTranslations]
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
