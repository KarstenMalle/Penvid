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
  const [locale, setLocaleState] = useState<Locale>('en')
  const [currency, setCurrencyState] = useState<Currency>('DKK')
  const [country, setCountryState] = useState<Country>('DK')
  const [theme, setThemeState] = useState('system')
  const [translations, setTranslations] = useState<Record<string, any>>({})
  const [languages, setLanguages] =
    useState<Record<Locale, LanguageInfo>>(INITIAL_LANGUAGES)
  const [exchangeRates, setExchangeRates] = useState<
    Record<Currency, Record<Currency, number>>
  >({} as Record<Currency, Record<Currency, number>>)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get Supabase client
  const supabase = createClient()

  // Set auth token when user changes
  useEffect(() => {
    const updateAuthToken = async () => {
      if (user && isAuthenticated) {
        try {
          // Get the session from Supabase
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session?.access_token) {
            apiClient.setAuthToken(session.access_token)
          }
        } catch (error) {
          console.error('Error getting auth token:', error)
        }
      } else {
        apiClient.setAuthToken(null)
      }
    }

    updateAuthToken()
  }, [user, isAuthenticated, supabase])

  // Function to load cached data from localStorage
  const loadFromCache = useCallback(
    (key: string, timestampKey: string, duration: number) => {
      try {
        const cachedData = localStorage.getItem(key)
        const timestamp = localStorage.getItem(timestampKey)

        if (cachedData && timestamp) {
          const parsedTimestamp = parseInt(timestamp, 10)

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

  // Function to fetch translations
  const fetchTranslations = useCallback(
    async (selectedLocale: Locale) => {
      const cachedTranslations = loadFromCache(
        `${STORAGE_KEYS.TRANSLATIONS}_${selectedLocale}`,
        `${STORAGE_KEYS.TRANSLATIONS_TIMESTAMP}_${selectedLocale}`,
        CACHE_DURATION.TRANSLATIONS
      )

      if (cachedTranslations) {
        setTranslations(cachedTranslations)
        return cachedTranslations
      }

      try {
        const response = await apiClient.get(
          API_ENDPOINTS.translations.get(selectedLocale)
        )

        if (response.success && response.data?.translations) {
          setTranslations(response.data.translations)
          saveToCache(
            `${STORAGE_KEYS.TRANSLATIONS}_${selectedLocale}`,
            `${STORAGE_KEYS.TRANSLATIONS_TIMESTAMP}_${selectedLocale}`,
            response.data.translations
          )
          return response.data.translations
        }

        // Return empty translations object
        return {}
      } catch (error: any) {
        console.error(
          `Error fetching translations for ${selectedLocale}:`,
          error
        )
        // Return empty translations object
        return {}
      }
    },
    [loadFromCache, saveToCache]
  )

  // Function to fetch exchange rates
  const fetchExchangeRates = useCallback(async () => {
    const cachedRates = loadFromCache(
      STORAGE_KEYS.EXCHANGE_RATES,
      STORAGE_KEYS.EXCHANGE_RATES_TIMESTAMP,
      CACHE_DURATION.EXCHANGE_RATES
    )

    if (cachedRates) {
      setExchangeRates(cachedRates)
      return cachedRates
    }

    try {
      const response = await apiClient.get(API_ENDPOINTS.currency.rates)

      if (response.success && response.data?.rates) {
        setExchangeRates(response.data.rates)
        saveToCache(
          STORAGE_KEYS.EXCHANGE_RATES,
          STORAGE_KEYS.EXCHANGE_RATES_TIMESTAMP,
          response.data.rates
        )
        return response.data.rates
      }

      // Return empty rates object
      return {}
    } catch (error: any) {
      console.error('Error fetching exchange rates:', error)
      // Return empty rates object
      return {}
    }
  }, [loadFromCache, saveToCache])

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch all initial data in parallel
        const [languagesResult, ratesResult] = await Promise.allSettled([
          fetchLanguages(),
          fetchExchangeRates(),
        ])

        // Log any errors but don't fail the whole initialization
        if (languagesResult.status === 'rejected') {
          console.error('Failed to fetch languages:', languagesResult.reason)
        }
        if (ratesResult.status === 'rejected') {
          console.error('Failed to fetch exchange rates:', ratesResult.reason)
        }

        // Always try to load default translations
        await fetchTranslations('en')
      } catch (error) {
        console.error('Error initializing data:', error)
        setError('Failed to initialize data')
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  // Fetch user preferences
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!isAuthenticated || !user) {
        return
      }

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
      }
    }

    fetchUserPreferences()
  }, [isAuthenticated, user, fetchTranslations, supabase])

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
      // Ensure we have a valid token
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        apiClient.setAuthToken(session.access_token)
      }

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
    let current: any = translations

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return defaultValue || key
      }
    }

    if (typeof current !== 'string') {
      return defaultValue || key
    }

    let result = current
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        result = result.replace(`{${param}}`, value)
      })
    }

    return result
  }

  // Currency conversion function
  const convertCurrency = (
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ): number => {
    if (fromCurrency === toCurrency) return amount

    const fromRate = exchangeRates[fromCurrency]?.[toCurrency]
    if (fromRate) {
      return amount * fromRate
    }

    const toRate = exchangeRates[toCurrency]?.[fromCurrency]
    if (toRate) {
      return amount / toRate
    }

    if (exchangeRates['USD']) {
      const fromUSD = exchangeRates['USD'][fromCurrency]
        ? 1 / exchangeRates['USD'][fromCurrency]
        : exchangeRates[fromCurrency]?.['USD']

      const toUSD = exchangeRates['USD'][toCurrency]
        ? exchangeRates['USD'][toCurrency]
        : exchangeRates[toCurrency]?.['USD']
          ? 1 / exchangeRates[toCurrency]['USD']
          : null

      if (toUSD && fromUSD) {
        return amount * toUSD * fromUSD
      }
    }

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
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }

    const mergedOptions = { ...defaultOptions, ...options }

    let convertedValue = value
    if (options?.originalCurrency && options.originalCurrency !== currency) {
      convertedValue = convertCurrency(
        value,
        options.originalCurrency,
        currency
      )
    }

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
