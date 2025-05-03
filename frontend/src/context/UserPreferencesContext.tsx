// frontend/src/context/UserPreferencesContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
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
import { createClient } from '@/lib/supabase-browser'
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
  const { user, isAuthenticated, loading: authLoading, profile } = useAuth()
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const apiCallInProgress = useRef<boolean>(false)
  const preferencesUpdated = useRef<boolean>(false)

  // Load preferences from local storage first, then check profile if authenticated
  useEffect(() => {
    const loadPreferences = async () => {
      // Don't try to load if we're already loading or if auth is still loading
      if (apiCallInProgress.current || authLoading) {
        return
      }

      setLoading(true)
      apiCallInProgress.current = true

      try {
        // Try to load from local storage first
        const storedPrefs = localStorage.getItem(STORAGE_KEY)
        if (storedPrefs) {
          console.log('Loading preferences from local storage')
          try {
            const localPrefs = JSON.parse(storedPrefs)
            setPreferences(localPrefs)
            setInitialized(true)
          } catch (parseError) {
            console.error(
              'Error parsing preferences from local storage:',
              parseError
            )
            // Continue to try profile preferences even if local storage fails
          }
        }

        // If authenticated and we have a profile, use profile preferences
        if (isAuthenticated && user && profile) {
          console.log('Using preferences from user profile')

          // Extract preferences from profile
          const profilePrefs: UserPreferences = {
            language: (profile.language_preference as Locale) || defaultLocale,
            currency:
              (profile.currency_preference as Currency) || defaultCurrency,
            country: (profile.country_preference as Country) || defaultCountry,
            theme: profile.theme_preference || 'light',
          }

          // Update state and local storage
          setPreferences(profilePrefs)
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profilePrefs))
          } catch (storageError) {
            console.error(
              'Error saving preferences to local storage:',
              storageError
            )
            // Continue anyway, as state is still updated
          }

          setInitialized(true)
          preferencesUpdated.current = true
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
        // If we couldn't load preferences and don't have local storage,
        // initialize with defaults
        if (!initialized) {
          setPreferences(defaultPreferences)
          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(defaultPreferences)
            )
          } catch (storageError) {
            console.error(
              'Error saving default preferences to local storage:',
              storageError
            )
          }
          setInitialized(true)
        }
      } finally {
        setLoading(false)
        apiCallInProgress.current = false
      }
    }

    loadPreferences()
  }, [user, isAuthenticated, authLoading, profile])

  // Update profile in Supabase
  const updateProfilePreferences = async (
    updatedPrefs: Partial<UserPreferences>
  ) => {
    if (!isAuthenticated || !user || apiCallInProgress.current) return false

    apiCallInProgress.current = true

    try {
      const supabase = createClient()

      // Map to profile table field names
      const updateData: any = {}

      if (updatedPrefs.language) {
        updateData.language_preference = updatedPrefs.language
      }

      if (updatedPrefs.currency) {
        updateData.currency_preference = updatedPrefs.currency
      }

      if (updatedPrefs.country) {
        updateData.country_preference = updatedPrefs.country
      }

      if (updatedPrefs.theme) {
        updateData.theme_preference = updatedPrefs.theme
      }

      updateData.updated_at = new Date().toISOString()

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
    } finally {
      apiCallInProgress.current = false
    }
  }

  // Update functions for individual preferences
  const setLanguage = async (language: Locale) => {
    if (preferences.language === language) return

    const newPrefs = { ...preferences, language }
    setPreferences(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))

    if (isAuthenticated) {
      const success = await updateProfilePreferences({ language })
      if (success) {
        toast.success(`Language changed to ${language}`)
      } else {
        toast.error('Failed to update language preference')
      }
    }
  }

  const setCurrency = async (currency: Currency) => {
    if (preferences.currency === currency) return

    const newPrefs = { ...preferences, currency }
    setPreferences(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))

    if (isAuthenticated) {
      const success = await updateProfilePreferences({ currency })
      if (success) {
        toast.success(`Currency changed to ${currency}`)
      } else {
        toast.error('Failed to update currency preference')
      }
    }
  }

  const setCountry = async (country: Country) => {
    if (preferences.country === country) return

    const newPrefs = { ...preferences, country }
    setPreferences(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))

    if (isAuthenticated) {
      const success = await updateProfilePreferences({ country })
      if (success) {
        toast.success(`Country changed to ${country}`)
      } else {
        toast.error('Failed to update country preference')
      }
    }
  }

  const setTheme = async (theme: string) => {
    if (preferences.theme === theme) return

    const newPrefs = { ...preferences, theme }
    setPreferences(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))

    if (isAuthenticated) {
      const success = await updateProfilePreferences({ theme })
      if (!success) {
        toast.error('Failed to update theme preference')
      }
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
        loading: loading || authLoading,
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
