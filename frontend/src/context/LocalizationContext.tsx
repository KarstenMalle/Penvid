'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import apiService from '@/lib/api-client'
import {
  i18n,
  Locale,
  Currency,
  Country,
  languages,
  currencies,
  countries,
} from '@/i18n/config'
import toast from 'react-hot-toast'

// Define the context type
interface LocalizationContextType {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  currency: Currency
  setCurrency: (currency: Currency) => Promise<void>
  country: Country
  setCountry: (country: Country) => Promise<void>
  t: (key: string, params?: Record<string, string | number>) => string
  formatCurrency: (amount: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ) => string
  languages: typeof languages
  currencies: typeof currencies
  countries: typeof countries
  loading: boolean
  error: string | null
}

// Create the context
const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
)

// Provider component
export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>('en')
  const [currency, setCurrencyState] = useState<Currency>('USD')
  const [country, setCountryState] = useState<Country>('US')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load user's localization preferences if authenticated
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const profile = await apiService.getProfile()

        if (profile) {
          if (
            profile.language_preference &&
            Object.keys(languages).includes(profile.language_preference)
          ) {
            setLocaleState(profile.language_preference as Locale)
          }

          if (
            profile.currency_preference &&
            Object.keys(currencies).includes(profile.currency_preference)
          ) {
            setCurrencyState(profile.currency_preference as Currency)
          }

          if (
            profile.country_preference &&
            Object.keys(countries).includes(profile.country_preference)
          ) {
            setCountryState(profile.country_preference as Country)
          }
        }
      } catch (err) {
        console.error('Failed to load user localization preferences:', err)
        setError('Failed to load localization preferences')
      } finally {
        setLoading(false)
      }
    }

    loadUserPreferences()
  }, [isAuthenticated, user])

  // Update locale
  const setLocale = async (newLocale: Locale) => {
    try {
      setLocaleState(newLocale)

      // Only update on backend if user is authenticated
      if (isAuthenticated && user) {
        await apiService.updateProfile({
          language_preference: newLocale,
        })
        toast.success(`Language changed to ${languages[newLocale].name}`)
      }
    } catch (err) {
      console.error('Failed to update language preference:', err)
      setError('Failed to update language preference')
      // Revert to previous locale on error
      setLocaleState(locale)
      toast.error('Failed to update language preference')
      throw err
    }
  }

  // Update currency
  const setCurrency = async (newCurrency: Currency) => {
    try {
      setCurrencyState(newCurrency)

      // Only update on backend if user is authenticated
      if (isAuthenticated && user) {
        await apiService.updateProfile({
          currency_preference: newCurrency,
        })
        toast.success(`Currency changed to ${currencies[newCurrency].name}`)
      }
    } catch (err) {
      console.error('Failed to update currency preference:', err)
      setError('Failed to update currency preference')
      // Revert to previous currency on error
      setCurrencyState(currency)
      toast.error('Failed to update currency preference')
      throw err
    }
  }

  // Update country
  const setCountry = async (newCountry: Country) => {
    try {
      setCountryState(newCountry)

      // Only update on backend if user is authenticated
      if (isAuthenticated && user) {
        await apiService.updateProfile({
          country_preference: newCountry,
        })
        toast.success(`Country changed to ${countries[newCountry].name}`)
      }
    } catch (err) {
      console.error('Failed to update country preference:', err)
      setError('Failed to update country preference')
      // Revert to previous country on error
      setCountryState(country)
      toast.error('Failed to update country preference')
      throw err
    }
  }

  // Translate function with parameter support
  const t = (key: string, params?: Record<string, string | number>): string => {
    try {
      const keys = key.split('.')
      let result: any = i18n[locale]

      for (const k of keys) {
        if (result[k] === undefined) {
          console.warn(`Translation key not found: ${key}`)
          return key
        }
        result = result[k]
      }

      if (typeof result === 'string' && params) {
        // Replace parameters in the form {{paramName}}
        return Object.entries(params).reduce(
          (text, [key, value]) =>
            text.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
          result
        )
      }

      return result
    } catch (err) {
      console.error('Translation error:', err)
      return key
    }
  }

  // Format currency
  const formatCurrency = (
    amount: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    try {
      const formatter = new Intl.NumberFormat(currencies[currency].locale, {
        style: 'currency',
        currency: currency,
        ...options,
      })

      return formatter.format(amount)
    } catch (err) {
      console.error('Currency formatting error:', err)
      return `${amount} ${currency}`
    }
  }

  // Format date
  const formatDate = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date

      return new Intl.DateTimeFormat(languages[locale].locale, options).format(
        dateObj
      )
    } catch (err) {
      console.error('Date formatting error:', err)
      return String(date)
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
        formatDate,
        languages,
        currencies,
        countries,
        loading,
        error,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  )
}

// Custom hook to use the localization context
export function useLocalization() {
  const context = useContext(LocalizationContext)
  if (!context) {
    throw new Error(
      'useLocalization must be used within a LocalizationProvider'
    )
  }
  return context
}
