// File: frontend/src/context/LocalizationContext.tsx

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/services/ApiClient'
import { API_ENDPOINTS } from '@/config/api'
import { createClient } from '@/lib/supabase-browser'

// Types
export type Locale = 'en' | 'da'
export type Currency = 'USD' | 'DKK' | 'EUR'
export type Country = 'US' | 'DK'

interface LanguageInfo {
  name: string
  native_name: string
  flag: string
  displayName: string
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
  t: (
    key: string,
    defaultValue?: string,
    params?: Record<string, string>
  ) => string
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
  currencies: Record<Currency, any>
  countries: Record<Country, any>
  loading: boolean
  error: string | null
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
)

// Constants
const INITIAL_LANGUAGES: Record<Locale, LanguageInfo> = {
  en: {
    name: 'English',
    native_name: 'English',
    flag: '🇺🇸',
    displayName: 'English',
  },
  da: {
    name: 'Danish',
    native_name: 'Dansk',
    flag: '🇩🇰',
    displayName: 'Danish',
  },
}

const CURRENCIES = {
  USD: { name: 'US Dollar', displayName: 'USD', flag: '🇺🇸', symbol: '$' },
  DKK: { name: 'Danish Krone', displayName: 'DKK', flag: '🇩🇰', symbol: 'kr' },
  EUR: { name: 'Euro', displayName: 'EUR', flag: '🇪🇺', symbol: '€' },
}

const COUNTRIES = {
  US: {
    name: 'United States',
    displayName: 'United States',
    flag: '🇺🇸',
    rules: {
      mortgageInterestDeductible: true,
      mortgageInterestDeductionRate: 0.24,
      maxMortgageInterestDeduction: 750000,
      studentLoanInterestDeductible: true,
      maxStudentLoanInterestDeduction: 2500,
    },
  },
  DK: {
    name: 'Denmark',
    displayName: 'Denmark',
    flag: '🇩🇰',
    rules: {
      mortgageInterestDeductible: true,
      mortgageInterestDeductionRate: 0.33,
      studentLoanInterestDeductible: false,
    },
  },
}

// Cache configuration
const CACHE_DURATION = {
  TRANSLATIONS: 7 * 24 * 60 * 60 * 1000, // 7 days
  LANGUAGES: 30 * 24 * 60 * 60 * 1000, // 30 days
  EXCHANGE_RATES: 24 * 60 * 60 * 1000, // 24 hours
}

const STORAGE_KEYS = {
  LOCALE: 'penvid_locale',
  CURRENCY: 'penvid_currency',
  COUNTRY: 'penvid_country',
  THEME: 'penvid_theme',
  TRANSLATIONS: 'penvid_translations',
  LANGUAGES: 'penvid_languages',
  EXCHANGE_RATES: 'penvid_exchange_rates',
  TRANSLATIONS_TIMESTAMP: 'penvid_translations_timestamp',
  LANGUAGES_TIMESTAMP: 'penvid_languages_timestamp',
  EXCHANGE_RATES_TIMESTAMP: 'penvid_exchange_rates_timestamp',
}

// Provider component
export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth()
  const supabase = createClient()

  // Refs to prevent duplicate API calls
  const initializingRef = useRef(false)
  const fetchingPreferencesRef = useRef(false)
  const authTokenSetRef = useRef(false)

  // State
  const [locale, setLocaleState] = useState<Locale>('en')
  const [currency, setCurrencyState] = useState<Currency>('DKK')
  const [country, setCountryState] = useState<Country>('DK')
  const [theme, setThemeState] = useState<string>('system')
  const [translations, setTranslations] = useState<Record<string, any>>({})
  const [languages, setLanguages] =
    useState<Record<Locale, LanguageInfo>>(INITIAL_LANGUAGES)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Utility functions for caching
  const loadFromCache = useCallback(
    (key: string, timestampKey: string, duration: number) => {
      if (typeof window === 'undefined') return null

      try {
        const timestamp = localStorage.getItem(timestampKey)
        const cached = localStorage.getItem(key)

        if (timestamp && cached) {
          const age = Date.now() - parseInt(timestamp)
          if (age < duration) {
            return JSON.parse(cached)
          }
        }
      } catch (error) {
        console.error(`Error loading from cache (${key}):`, error)
      }
      return null
    },
    []
  )

  const saveToCache = useCallback(
    (key: string, timestampKey: string, data: any) => {
      if (typeof window === 'undefined') return

      try {
        localStorage.setItem(key, JSON.stringify(data))
        localStorage.setItem(timestampKey, Date.now().toString())
      } catch (error) {
        console.error(`Error saving to cache (${key}):`, error)
      }
    },
    []
  )

  // Initialize authentication token when user changes - FIXED: Prevent duplicates
  useEffect(() => {
    const initializeAuth = async () => {
      if (isAuthenticated && user && !authTokenSetRef.current) {
        authTokenSetRef.current = true
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session?.access_token) {
            apiClient.setAuthToken(session.access_token)
          }
        } catch (error) {
          console.error('Error setting auth token:', error)
        }
      } else if (!isAuthenticated) {
        authTokenSetRef.current = false
      }
    }

    initializeAuth()
  }, [isAuthenticated, user, supabase])

  // Fetch available languages - FIXED: Prevent duplicates
  const fetchLanguages = useCallback(async () => {
    const cachedLanguages = loadFromCache(
      STORAGE_KEYS.LANGUAGES,
      STORAGE_KEYS.LANGUAGES_TIMESTAMP,
      CACHE_DURATION.LANGUAGES
    )

    if (cachedLanguages) {
      setLanguages(cachedLanguages)
      return cachedLanguages
    }

    try {
      console.log('Fetching languages from API...')
      const response = await apiClient.get(API_ENDPOINTS.translations.available)

      if (response.success && response.data?.locales) {
        const languagesMap: Record<Locale, LanguageInfo> = {}

        response.data.locales.forEach((locale: any) => {
          if (locale.code === 'en' || locale.code === 'da') {
            languagesMap[locale.code as Locale] = {
              name: locale.name,
              native_name: locale.native_name,
              flag: locale.flag,
              displayName: locale.name,
            }
          }
        })

        setLanguages(languagesMap)
        saveToCache(
          STORAGE_KEYS.LANGUAGES,
          STORAGE_KEYS.LANGUAGES_TIMESTAMP,
          languagesMap
        )

        return languagesMap
      }

      // Use fallback languages
      setLanguages(INITIAL_LANGUAGES)
      return INITIAL_LANGUAGES
    } catch (error: any) {
      console.error('Error fetching languages:', error)
      // Use fallback languages
      setLanguages(INITIAL_LANGUAGES)
      return INITIAL_LANGUAGES
    }
  }, [loadFromCache, saveToCache])

  // Function to fetch translations - FIXED: Prevent duplicates
  const fetchTranslations = useCallback(
    async (selectedLocale: Locale) => {
      const cacheKey = `${STORAGE_KEYS.TRANSLATIONS}_${selectedLocale}`
      const timestampKey = `${STORAGE_KEYS.TRANSLATIONS_TIMESTAMP}_${selectedLocale}`

      const cachedTranslations = loadFromCache(
        cacheKey,
        timestampKey,
        CACHE_DURATION.TRANSLATIONS
      )

      if (cachedTranslations) {
        setTranslations(cachedTranslations)
        return cachedTranslations
      }

      try {
        console.log(`Fetching ${selectedLocale} translations from API...`)
        const response = await apiClient.get(
          API_ENDPOINTS.translations.get(selectedLocale)
        )

        if (response.success && response.data?.translations) {
          setTranslations(response.data.translations)
          saveToCache(cacheKey, timestampKey, response.data.translations)
          return response.data.translations
        }

        // Return empty translations object if no data
        console.warn(`No translations found for locale: ${selectedLocale}`)
        return {}
      } catch (error: any) {
        console.error(
          `Error fetching translations for ${selectedLocale}:`,
          error
        )
        // Return empty translations object on error
        return {}
      }
    },
    [loadFromCache, saveToCache]
  )

  // Function to fetch exchange rates - FIXED: Remove for now to reduce API calls
  const fetchExchangeRates = useCallback(async () => {
    // For now, return empty rates to reduce API calls
    // You can implement this later when you have a currency API
    return {}
  }, [])

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
      console.warn('User not authenticated, skipping preference update')
      return
    }

    try {
      // Ensure we have a valid token
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        apiClient.setAuthToken(session.access_token)
      }

      console.log('Updating user preferences:', updates)
      const response = await apiClient.post(
        API_ENDPOINTS.preferences.update,
        updates
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to update preferences')
      }

      return response.data?.preferences
    } catch (error: any) {
      console.error('Error updating user preferences:', error)
      throw error
    }
  }

  // Set locale with API update
  const setLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return

    setLocaleState(newLocale)

    try {
      await fetchTranslations(newLocale)
    } catch (error) {
      console.error(`Error fetching translations for ${newLocale}:`, error)
    }

    if (isAuthenticated && user) {
      try {
        await updateUserPreferences({ locale: newLocale })
      } catch (error) {
        console.error('Failed to save locale preference:', error)
      }
    } else {
      // Save to localStorage for non-authenticated users
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LOCALE, newLocale)
      }
    }
  }

  // Set currency with API update
  const setCurrency = async (newCurrency: Currency) => {
    if (newCurrency === currency) return

    setCurrencyState(newCurrency)

    if (isAuthenticated && user) {
      try {
        await updateUserPreferences({ currency: newCurrency })
      } catch (error) {
        console.error('Failed to save currency preference:', error)
      }
    } else {
      // Save to localStorage for non-authenticated users
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CURRENCY, newCurrency)
      }
    }
  }

  // Set country with API update
  const setCountry = async (newCountry: Country) => {
    if (newCountry === country) return

    setCountryState(newCountry)

    if (isAuthenticated && user) {
      try {
        await updateUserPreferences({ country: newCountry })
      } catch (error) {
        console.error('Failed to save country preference:', error)
      }
    } else {
      // Save to localStorage for non-authenticated users
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.COUNTRY, newCountry)
      }
    }
  }

  // Set theme with API update
  const setTheme = async (newTheme: string) => {
    if (newTheme === theme) return

    setThemeState(newTheme)

    if (isAuthenticated && user) {
      try {
        await updateUserPreferences({ theme: newTheme })
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
    } else {
      // Save to localStorage for non-authenticated users
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme)
      }
    }
  }

  // Translation function
  const t = (
    key: string,
    defaultValue?: string,
    params?: Record<string, string>
  ): string => {
    // If translations are not loaded yet, return default or key
    if (!translations || Object.keys(translations).length === 0) {
      return defaultValue || key
    }

    const parts = key.split('.')
    let value: any = translations

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return defaultValue || key
      }
    }

    if (typeof value !== 'string') {
      return defaultValue || key
    }

    // Replace parameters if provided
    if (params) {
      return Object.entries(params).reduce(
        (text, [key, replacement]) => text.replace(`{{${key}}}`, replacement),
        value
      )
    }

    return value
  }

  // Formatting functions
  const formatCurrency = (
    value: number,
    options?: Intl.NumberFormatOptions & { originalCurrency?: Currency }
  ): string => {
    const { originalCurrency, ...intlOptions } = options || {}
    const formatOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: originalCurrency || currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...intlOptions,
    }

    // Convert currency if needed and exchange rates are available
    let convertedValue = value
    if (
      originalCurrency &&
      originalCurrency !== currency &&
      exchangeRates[currency]
    ) {
      convertedValue = value * exchangeRates[currency]
    }

    const localeCode = locale === 'da' ? 'da-DK' : 'en-US'
    return new Intl.NumberFormat(localeCode, formatOptions).format(
      convertedValue
    )
  }

  const formatDate = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const localeCode = locale === 'da' ? 'da-DK' : 'en-US'
    return new Intl.DateTimeFormat(localeCode, options).format(dateObj)
  }

  const formatNumber = (
    value: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    const localeCode = locale === 'da' ? 'da-DK' : 'en-US'
    return new Intl.NumberFormat(localeCode, options).format(value)
  }

  // Initialize data on mount - FIXED: Prevent duplicate calls
  useEffect(() => {
    const initializeData = async () => {
      if (initializingRef.current) return
      initializingRef.current = true

      setLoading(true)
      setError(null)

      try {
        // Load cached preferences for non-authenticated users
        if (!isAuthenticated && typeof window !== 'undefined') {
          const cachedLocale = localStorage.getItem(
            STORAGE_KEYS.LOCALE
          ) as Locale
          const cachedCurrency = localStorage.getItem(
            STORAGE_KEYS.CURRENCY
          ) as Currency
          const cachedCountry = localStorage.getItem(
            STORAGE_KEYS.COUNTRY
          ) as Country
          const cachedTheme = localStorage.getItem(STORAGE_KEYS.THEME)

          if (
            cachedLocale &&
            (cachedLocale === 'en' || cachedLocale === 'da')
          ) {
            setLocaleState(cachedLocale)
          }
          if (
            cachedCurrency &&
            Object.keys(CURRENCIES).includes(cachedCurrency)
          ) {
            setCurrencyState(cachedCurrency)
          }
          if (cachedCountry && Object.keys(COUNTRIES).includes(cachedCountry)) {
            setCountryState(cachedCountry)
          }
          if (cachedTheme) {
            setThemeState(cachedTheme)
          }
        }

        // Fetch initial data - REDUCED: Only fetch what we need
        console.log('Initializing localization data...')

        // Fetch languages
        await fetchLanguages()

        // Always try to load default translations
        await fetchTranslations(locale)
      } catch (error) {
        console.error('Error initializing data:', error)
        setError('Failed to initialize data')
      } finally {
        setLoading(false)
        initializingRef.current = false
      }
    }

    initializeData()
  }, []) // FIXED: Empty dependency array to prevent re-runs

  // Fetch user preferences when authenticated - FIXED: Prevent duplicates
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!isAuthenticated || !user || fetchingPreferencesRef.current) {
        return
      }

      fetchingPreferencesRef.current = true

      try {
        // Get the session to ensure we have a valid token
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) {
          console.log('No valid session for fetching preferences')
          return
        }

        // Update the token before making the request
        apiClient.setAuthToken(session.access_token)

        console.log('Fetching user preferences...')
        const response = await apiClient.get(API_ENDPOINTS.preferences.get)

        if (response.success && response.data?.preferences) {
          const prefs = response.data.preferences

          if (
            prefs.locale &&
            (prefs.locale === 'en' || prefs.locale === 'da')
          ) {
            setLocaleState(prefs.locale as Locale)
            await fetchTranslations(prefs.locale as Locale)
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
        }
      } catch (error: any) {
        console.error('Error fetching user preferences:', error)
        // Don't set error state here as it's not critical
      } finally {
        fetchingPreferencesRef.current = false
      }
    }

    fetchUserPreferences()
  }, [isAuthenticated, user, supabase, fetchTranslations])

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

// Hook to use localization context
export const useLocalization = () => {
  const context = useContext(LocalizationContext)
  if (context === undefined) {
    throw new Error(
      'useLocalization must be used within a LocalizationProvider'
    )
  }
  return context
}
