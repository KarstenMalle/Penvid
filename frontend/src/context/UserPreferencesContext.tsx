// frontend/src/context/UserPreferencesContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import {
  Locale,
  Currency,
  Country,
  defaultLocale,
  defaultCurrency,
  defaultCountry,
} from '@/i18n/config'
import { ApiClient } from '@/services/ApiClient'
import toast from 'react-hot-toast'

interface UserPreferences {
  language: Locale
  currency: Currency
  country: Country
  theme?: string
}

interface UserPreferencesContextType {
  preferences: UserPreferences
  setLanguage: (language: Locale) => Promise<void>
  setCurrency: (currency: Currency) => Promise<void>
  setCountry: (country: Country) => Promise<void>
  setTheme: (theme: string) => Promise<void>
  loading: boolean
  initialized: boolean
}

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined)

// Default preferences for new users
const defaultPreferences: UserPreferences = {
  language: defaultLocale,
  currency: defaultCurrency,
  country: defaultCountry,
  theme: 'light',
}

// Local storage keys
const STORAGE_KEY = 'user_preferences'

export const UserPreferencesProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const { user, isAuthenticated } = useAuth()
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Load preferences from local storage first, then check database if authenticated
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true)

      try {
        // Try to load from local storage first
        const storedPrefs = localStorage.getItem(STORAGE_KEY)
        if (storedPrefs) {
          console.log('Loading preferences from local storage')
          setPreferences(JSON.parse(storedPrefs))
          setInitialized(true)
        }

        // If authenticated, fetch from API and update
        if (isAuthenticated && user) {
          console.log('Fetching preferences from server')
          const response = await ApiClient.get(
            `/api/user/${user.id}/preferences`
          )

          if (response.success && response.data) {
            const apiPrefs = response.data

            // Check if API preferences differ from stored preferences
            const newPrefs = {
              language: (apiPrefs.language as Locale) || preferences.language,
              currency: (apiPrefs.currency as Currency) || preferences.currency,
              country: (apiPrefs.country as Country) || preferences.country,
              theme: apiPrefs.theme || preferences.theme,
            }

            setPreferences(newPrefs)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
            setInitialized(true)
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
        // If we couldn't load preferences and don't have local storage,
        // initialize with defaults
        if (!initialized) {
          setPreferences(defaultPreferences)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPreferences))
          setInitialized(true)
        }
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user, isAuthenticated])

  // Save preferences to database
  const savePreferencesToDB = async (
    updatedPrefs: Partial<UserPreferences>
  ) => {
    if (!isAuthenticated || !user) return

    try {
      await ApiClient.put(`/api/user/${user.id}/preferences`, updatedPrefs)
    } catch (error) {
      console.error('Error saving preferences to database:', error)
      toast.error('Failed to save preferences to server')
    }
  }

  // Update functions for individual preferences
  const setLanguage = async (language: Locale) => {
    const newPrefs = { ...preferences, language }
    setPreferences(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))

    if (isAuthenticated) {
      await savePreferencesToDB({ language })
    }
  }

  const setCurrency = async (currency: Currency) => {
    const newPrefs = { ...preferences, currency }
    setPreferences(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))

    if (isAuthenticated) {
      await savePreferencesToDB({ currency })
    }
  }

  const setCountry = async (country: Country) => {
    const newPrefs = { ...preferences, country }
    setPreferences(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))

    if (isAuthenticated) {
      await savePreferencesToDB({ country })
    }
  }

  const setTheme = async (theme: string) => {
    const newPrefs = { ...preferences, theme }
    setPreferences(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))

    if (isAuthenticated) {
      await savePreferencesToDB({ theme })
    }
  }

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        setLanguage,
        setCurrency,
        setCountry,
        setTheme,
        loading,
        initialized,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error(
      'useUserPreferences must be used within a UserPreferencesProvider'
    )
  }
  return context
}
