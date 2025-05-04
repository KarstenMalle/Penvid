// File: frontend/src/context/LocalizationContext.tsx

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useAuth } from '@/context/AuthContext'

// Types
export type Locale = 'en' | 'da'
export type Currency = 'USD' | 'DKK' | 'EUR'
export type Country = 'US' | 'DK'

interface LanguageInfo {
  name: string
  native_name: string
  flag: string
}

interface CurrencyInfo {
  name: string
  displayName: string
  flag: string
  symbol: string
}

interface CountryInfo {
  name: string
  displayName: string
  flag: string
  rules: {
    mortgageInterestDeductible: boolean
    mortgageInterestDeductionRate?: number
    maxMortgageInterestDeduction?: number
    studentLoanInterestDeductible: boolean
    maxStudentLoanInterestDeduction?: number
  }
}

interface LocalizationContextType {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  currency: Currency
  setCurrency: (currency: Currency) => Promise<void>
  country: Country
  setCountry: (country: Country) => Promise<void>
  theme: string
  setTheme: (theme: string) => Promise<void>
  t: (key: string, params?: Record<string, string>) => string
  formatCurrency: (
    value: number,
    options?: Intl.NumberFormatOptions & { originalCurrency?: Currency }
  ) => string
  formatDate: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  languages: Record<Locale, LanguageInfo>
  currencies: Record<Currency, CurrencyInfo>
  countries: Record<Country, CountryInfo>
  loading: boolean
  error: string | null
}

// Define available currencies and countries
const CURRENCIES: Record<Currency, CurrencyInfo> = {
  USD: { name: 'US Dollar', displayName: 'USD', flag: '🇺🇸', symbol: '$' },
  DKK: { name: 'Danish Krone', displayName: 'DKK', flag: '🇩🇰', symbol: 'kr' },
  EUR: { name: 'Euro', displayName: 'EUR', flag: '🇪🇺', symbol: '€' },
}

const COUNTRIES: Record<Country, CountryInfo> = {
  US: {
    name: 'United States',
    displayName: 'United States',
    flag: '🇺🇸',
    rules: {
      mortgageInterestDeductible: true,
      maxMortgageInterestDeduction: 750000,
      studentLoanInterestDeductible: true,
      maxStudentLoanInterestDeduction: 2500,
    },
  },
  DK: {
    name: 'Denmark',
    displayName: 'Danmark',
    flag: '🇩🇰',
    rules: {
      mortgageInterestDeductible: true,
      mortgageInterestDeductionRate: 0.33,
      studentLoanInterestDeductible: false,
    },
  },
}

// Create context
const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
)

// Storage keys for browser caching
const STORAGE_KEYS = {
  LANGUAGES: 'penvid_languages',
  TRANSLATIONS: 'penvid_translations',
  EXCHANGE_RATES: 'penvid_exchange_rates',
  LANGUAGES_TIMESTAMP: 'penvid_languages_timestamp',
  TRANSLATIONS_TIMESTAMP: 'penvid_translations_timestamp',
  EXCHANGE_RATES_TIMESTAMP: 'penvid_exchange_rates_timestamp',
}

// Cache duration (in milliseconds)
const CACHE_DURATION = {
  LANGUAGES: 7 * 24 * 60 * 60 * 1000, // 7 days for languages
  TRANSLATIONS: 7 * 24 * 60 * 60 * 1000, // 7 days for translations
  EXCHANGE_RATES: 24 * 60 * 60 * 1000, // 1 day for exchange rates
}

// API request timeout (in milliseconds)
const API_TIMEOUT = 5000

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Default translations
const DEFAULT_TRANSLATIONS: Record<string, any> = {
  common: {
    loading: 'Loading...',
    error: 'Error occurred',
    retry: 'Retry',
  },
}

// Create provider component
export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth()
  const [locale, setLocaleState] = useState<Locale>('en')
  const [currency, setCurrencyState] = useState<Currency>('DKK')
  const [country, setCountryState] = useState<Country>('DK')
  const [theme, setThemeState] = useState('system')
  const [translations, setTranslations] =
    useState<Record<string, any>>(DEFAULT_TRANSLATIONS)
  const [languages, setLanguages] = useState<Record<Locale, LanguageInfo>>(
    {} as any
  )
  const [exchangeRates, setExchangeRates] = useState<
    Record<Currency, Record<Currency, number>>
  >({} as any)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Function to load cached data from localStorage
  const loadFromCache = useCallback(
    (key: string, timestampKey: string, duration: number) => {
      try {
        const cachedData = localStorage.getItem(key)
        const timestamp = localStorage.getItem(timestampKey)

        if (cachedData && timestamp) {
          const parsedTimestamp = parseInt(timestamp, 10)

          // Check if cache is still valid
          if (Date.now() - parsedTimestamp < duration) {
            return JSON.parse(cachedData)
          }
        }
      } catch (e) {
        console.error(`Error loading cached ${key}:`, e)
      }

      return null
    },
    []
  )

  // Function to save data to cache
  const saveToCache = useCallback(
    (key: string, timestampKey: string, data: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(data))
        localStorage.setItem(timestampKey, Date.now().toString())
      } catch (e) {
        console.error(`Error saving to cache (${key}):`, e)
      }
    },
    []
  )

  // Fetch available languages
  const fetchLanguages = useCallback(async () => {
    // Try to load from cache first
    const cachedLanguages = loadFromCache(
      STORAGE_KEYS.LANGUAGES,
      STORAGE_KEYS.LANGUAGES_TIMESTAMP,
      CACHE_DURATION.LANGUAGES
    )

    if (cachedLanguages) {
      setLanguages(cachedLanguages)
      return cachedLanguages
    }

    // If not in cache, fetch from API with timeout
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

      const response = await fetch(`${API_URL}/translations/available`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.data?.locales) {
        // Transform the data to our format
        const languagesMap: Record<Locale, LanguageInfo> = {}

        data.data.locales.forEach((locale: any) => {
          if (locale.code === 'en' || locale.code === 'da') {
            languagesMap[locale.code as Locale] = {
              name: locale.name,
              native_name: locale.native_name,
              flag: locale.flag,
            }
          }
        })

        // Save to state and cache
        setLanguages(languagesMap)
        saveToCache(
          STORAGE_KEYS.LANGUAGES,
          STORAGE_KEYS.LANGUAGES_TIMESTAMP,
          languagesMap
        )

        return languagesMap
      }

      // Use default languages if API fails
      const defaultLanguages: Record<Locale, LanguageInfo> = {
        en: { name: 'English', native_name: 'English', flag: '🇺🇸' },
        da: { name: 'Danish', native_name: 'Dansk', flag: '🇩🇰' },
      }

      setLanguages(defaultLanguages)
      return defaultLanguages
    } catch (error: any) {
      console.error(`Error fetching languages:`, error)

      // Use default languages if API fails
      const defaultLanguages: Record<Locale, LanguageInfo> = {
        en: { name: 'English', native_name: 'English', flag: '🇺🇸' },
        da: { name: 'Danish', native_name: 'Dansk', flag: '🇩🇰' },
      }

      setLanguages(defaultLanguages)
      return defaultLanguages
    }
  }, [loadFromCache, saveToCache])

  // Function to fetch translations with timeout and caching
  const fetchTranslations = useCallback(
    async (selectedLocale: Locale) => {
      // Try to load from cache first
      const cachedTranslations = loadFromCache(
        `${STORAGE_KEYS.TRANSLATIONS}_${selectedLocale}`,
        `${STORAGE_KEYS.TRANSLATIONS_TIMESTAMP}_${selectedLocale}`,
        CACHE_DURATION.TRANSLATIONS
      )

      if (cachedTranslations) {
        setTranslations(cachedTranslations)
        return
      }

      // If not in cache, fetch from API with timeout
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

        const response = await fetch(
          `${API_URL}/translations/${selectedLocale}`,
          {
            signal: controller.signal,
          }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(
            `Failed to fetch translations: ${response.statusText}`
          )
        }

        const data = await response.json()

        if (data.data?.translations) {
          // Save to state and cache
          setTranslations(data.data.translations)
          saveToCache(
            `${STORAGE_KEYS.TRANSLATIONS}_${selectedLocale}`,
            `${STORAGE_KEYS.TRANSLATIONS_TIMESTAMP}_${selectedLocale}`,
            data.data.translations
          )
        } else {
          // Use default translations if API fails
          setTranslations(DEFAULT_TRANSLATIONS)
        }
      } catch (error: any) {
        console.error(
          `Error fetching translations for ${selectedLocale}:`,
          error
        )
        // Use default translations if API fails
        setTranslations(DEFAULT_TRANSLATIONS)
      }
    },
    [loadFromCache, saveToCache]
  )

  // Function to fetch exchange rates with timeout and caching
  const fetchExchangeRates = useCallback(async () => {
    // Try to load from cache first
    const cachedRates = loadFromCache(
      STORAGE_KEYS.EXCHANGE_RATES,
      STORAGE_KEYS.EXCHANGE_RATES_TIMESTAMP,
      CACHE_DURATION.EXCHANGE_RATES
    )

    if (cachedRates) {
      setExchangeRates(cachedRates)
      return
    }

    // If not in cache, fetch from API with timeout
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

      const response = await fetch(`${API_URL}/currency/rates`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `Failed to fetch exchange rates: ${response.statusText}`
        )
      }

      const data = await response.json()

      if (data.data?.rates) {
        // Save to state and cache
        setExchangeRates(data.data.rates)
        saveToCache(
          STORAGE_KEYS.EXCHANGE_RATES,
          STORAGE_KEYS.EXCHANGE_RATES_TIMESTAMP,
          data.data.rates
        )
      } else {
        // Use fallback rates if API fails
        const fallbackRates = {
          USD: { DKK: 6.9, EUR: 0.92 },
          DKK: { USD: 0.145, EUR: 0.134 },
          EUR: { USD: 1.09, DKK: 7.45 },
        }
        setExchangeRates(fallbackRates as any)
      }
    } catch (error: any) {
      console.error('Error fetching exchange rates:', error)
      // Use fallback rates if API fails
      const fallbackRates = {
        USD: { DKK: 6.9, EUR: 0.92 },
        DKK: { USD: 0.145, EUR: 0.134 },
        EUR: { USD: 1.09, DKK: 7.45 },
      }
      setExchangeRates(fallbackRates as any)
    }
  }, [loadFromCache, saveToCache])

  // Fetch initial data - languages and exchange rates
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch languages first
        await fetchLanguages()

        // Fetch exchange rates
        await fetchExchangeRates()
      } catch (error) {
        console.error('Error initializing data:', error)
        setError('Failed to initialize data')
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [fetchLanguages, fetchExchangeRates])

  // Fetch user preferences - only done once at login
  useEffect(() => {
    const fetchUserPreferences = async () => {
      // Only fetch if user is authenticated
      if (!isAuthenticated || !user) {
        // Load default translations for non-authenticated users
        await fetchTranslations('en')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Setup API timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

        const response = await fetch(`${API_URL}/preferences`, {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Failed to fetch preferences: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.data?.preferences) {
          const prefs = data.data.preferences

          // Only set if valid values
          if (
            prefs.locale &&
            (prefs.locale === 'en' || prefs.locale === 'da')
          ) {
            setLocaleState(prefs.locale as Locale)
            // Fetch translations for this locale
            await fetchTranslations(prefs.locale as Locale)
          } else {
            // Fetch default translations
            await fetchTranslations('en')
          }

          if (
            prefs.currency &&
            Object.keys(CURRENCIES).includes(prefs.currency)
          ) {
            setCurrencyState(prefs.currency as Currency)
          }

          if (prefs.country && Object.keys(COUNTRIES).includes(prefs.country)) {
            setCountryState(prefs.country as Country)
          }

          if (prefs.theme) {
            setThemeState(prefs.theme)
          }
        } else {
          // Fetch default translations
          await fetchTranslations('en')
        }
      } catch (error: any) {
        console.error('Error fetching user preferences:', error)
        setError('Failed to load user preferences')

        // Use defaults
        await fetchTranslations('en')
      } finally {
        setLoading(false)
      }
    }

    fetchUserPreferences()
  }, [isAuthenticated, user, fetchTranslations])

  // Update user preferences in API
  const updateUserPreferences = async (
    updates: Partial<{
      locale: Locale
      currency: Currency
      country: Country
      theme: string
    }>
  ) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated')
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

      const response = await fetch(`${API_URL}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify(updates),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.statusText}`)
      }

      // Return updated preferences
      const data = await response.json()
      return data.data?.preferences
    } catch (error: any) {
      console.error('Error updating user preferences:', error)
      throw error
    }
  }

  // Set locale with API update
  const setLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return

    // Update UI immediately for better UX
    setLocaleState(newLocale)

    // Load translations first for responsiveness
    await fetchTranslations(newLocale)

    // Then update in API (non-blocking)
    if (isAuthenticated && user) {
      try {
        await updateUserPreferences({ locale: newLocale })
      } catch (error) {
        console.error('Failed to save locale preference:', error)
      }
    }
  }

  // Set currency with API update
  const setCurrency = async (newCurrency: Currency) => {
    if (newCurrency === currency) return

    // Update UI immediately
    setCurrencyState(newCurrency)

    // Update in API (non-blocking)
    if (isAuthenticated && user) {
      try {
        await updateUserPreferences({ currency: newCurrency })
      } catch (error) {
        console.error('Failed to save currency preference:', error)
      }
    }
  }

  // Set country with API update
  const setCountry = async (newCountry: Country) => {
    if (newCountry === country) return

    // Update UI immediately
    setCountryState(newCountry)

    // Update in API (non-blocking)
    if (isAuthenticated && user) {
      try {
        await updateUserPreferences({ country: newCountry })
      } catch (error) {
        console.error('Failed to save country preference:', error)
      }
    }
  }

  // Set theme with API update
  const setTheme = async (newTheme: string) => {
    if (newTheme === theme) return

    // Update UI immediately
    setThemeState(newTheme)

    // Update in API (non-blocking)
    if (isAuthenticated && user) {
      try {
        await updateUserPreferences({ theme: newTheme })
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
    }
  }

  // Translation function
  const t = (key: string, params?: Record<string, string>): string => {
    // Split key by dots for nested access
    const parts = key.split('.')
    let result: any = translations

    // Navigate through nested structure
    for (const part of parts) {
      if (result && typeof result === 'object' && part in result) {
        result = result[part]
      } else {
        // Key not found in translations
        return key
      }
    }

    // If result is not a string, return key
    if (typeof result !== 'string') {
      return key
    }

    // Replace parameters
    if (params) {
      return Object.entries(params).reduce(
        (str, [param, value]) => str.replace(`{${param}}`, value),
        result
      )
    }

    return result
  }

  // Currency conversion function
  const convertCurrency = (
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ): number => {
    if (fromCurrency === toCurrency) {
      return amount
    }

    // Check if we have exchange rates
    if (
      exchangeRates &&
      exchangeRates[fromCurrency] &&
      exchangeRates[fromCurrency][toCurrency]
    ) {
      // Direct conversion
      return amount * exchangeRates[fromCurrency][toCurrency]
    } else if (
      exchangeRates &&
      exchangeRates[toCurrency] &&
      exchangeRates[toCurrency][fromCurrency]
    ) {
      // Inverse conversion
      return amount / exchangeRates[toCurrency][fromCurrency]
    } else if (
      fromCurrency !== 'USD' &&
      toCurrency !== 'USD' &&
      exchangeRates &&
      exchangeRates['USD']
    ) {
      // Use USD as intermediary
      const toUSD =
        exchangeRates[fromCurrency]?.['USD'] ||
        (exchangeRates['USD'][fromCurrency]
          ? 1 / exchangeRates['USD'][fromCurrency]
          : null)

      const fromUSD =
        exchangeRates['USD'][toCurrency] ||
        (exchangeRates[toCurrency]?.['USD']
          ? 1 / exchangeRates[toCurrency]['USD']
          : null)

      if (toUSD && fromUSD) {
        return amount * toUSD * fromUSD
      }
    }

    // Fallback to hardcoded rates if all else fails
    const fallbackRates = {
      USD: { DKK: 6.9, EUR: 0.92 },
      DKK: { USD: 0.145, EUR: 0.134 },
      EUR: { USD: 1.09, DKK: 7.45 },
    }

    if (fallbackRates[fromCurrency]?.[toCurrency]) {
      return amount * fallbackRates[fromCurrency][toCurrency]
    } else if (fallbackRates[toCurrency]?.[fromCurrency]) {
      return amount / fallbackRates[toCurrency][fromCurrency]
    }

    // Last resort fallback
    console.error(
      `No conversion rate found for ${fromCurrency} to ${toCurrency}`
    )
    return amount
  }

  // Format currency
  const formatCurrency = (
    value: number,
    options?: Intl.NumberFormatOptions & { originalCurrency?: Currency }
  ): string => {
    // Default formatting options
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }

    // Merge options
    const mergedOptions = { ...defaultOptions, ...options }

    // Convert value if needed
    let convertedValue = value
    if (options?.originalCurrency && options.originalCurrency !== currency) {
      convertedValue = convertCurrency(
        value,
        options.originalCurrency,
        currency
      )
    }

    // Format based on locale
    return new Intl.NumberFormat(
      locale === 'da' ? 'da-DK' : 'en-US',
      mergedOptions
    ).format(convertedValue)
  }

  // Format date
  const formatDate = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    return new Intl.DateTimeFormat(
      locale === 'da' ? 'da-DK' : 'en-US',
      options
    ).format(dateObj)
  }

  // Format number
  const formatNumber = (
    value: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    return new Intl.NumberFormat(
      locale === 'da' ? 'da-DK' : 'en-US',
      options
    ).format(value)
  }

  // Context value
  const contextValue: LocalizationContextType = {
    locale,
    setLocale,
    currency,
    setCurrency,
    country,
    setCountry,
    theme,
    setTheme,
    t,
    formatCurrency,
    formatDate,
    formatNumber,
    languages,
    currencies: CURRENCIES,
    countries: COUNTRIES,
    loading,
    error,
  }

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  )
}

// Custom hook for using the context
export const useLocalization = () => {
  const context = useContext(LocalizationContext)

  if (!context) {
    throw new Error(
      'useLocalization must be used within a LocalizationProvider'
    )
  }

  return context
}
