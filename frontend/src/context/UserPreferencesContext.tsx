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

  // Load preferences from local storage first, then check profile if authenticated
  useEffect(() => {
    const loadPreferences = async () => {
      // Don't try to load if we're already loading or if auth is still loading
      if (apiCallInProgress.current) {
        return
      }

      setLoading(true)
      apiCallInProgress.current = true
      console.log('Loading preferences...')

      try {
        // Try to load from local storage first
        let prefsLoaded = false
        const storedPrefs = localStorage.getItem(STORAGE_KEY)
        if (storedPrefs) {
          console.log('Found preferences in local storage')
          try {
            const localPrefs = JSON.parse(storedPrefs)
            setPreferences(localPrefs)
            prefsLoaded = true
            console.log('Successfully loaded preferences from local storage')
          } catch (parseError) {
            console.error(
              'Error parsing preferences from local storage:',
              parseError
            )
          }
        }

        // If authenticated and we have a profile, use profile preferences
        if (isAuthenticated && user && profile) {
          console.log('Using preferences from user profile')

          // Extract preferences from profile with proper fallbacks
          const profilePrefs: UserPreferences = {
            language: (profile.language_preference as Locale) || defaultLocale,
            currency:
              (profile.currency_preference as Currency) || defaultCurrency,
            country: (profile.country_preference as Country) || defaultCountry,
            theme: profile.theme_preference || 'light',
          }

          // Update state with profile preferences
          setPreferences(profilePrefs)

          // Save to local storage for next time
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profilePrefs))
            console.log('Saved profile preferences to local storage')
          } catch (storageError) {
            console.error(
              'Error saving preferences to local storage:',
              storageError
            )
          }

          prefsLoaded = true
        }

        // If we couldn't load preferences from anywhere, set defaults
        if (!prefsLoaded) {
          console.log('No preferences found, using defaults')
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
        }

        setInitialized(true)
      } catch (error) {
        console.error('Error loading preferences:', error)
        // If all else fails, ensure we have defaults
        setPreferences(defaultPreferences)
        setInitialized(true)
      } finally {
        setLoading(false)
        apiCallInProgress.current = false
        console.log('Finished loading preferences')
      }
    }

    // Only load preferences after auth is settled
    if (!authLoading) {
      loadPreferences()
    }
  }, [user, isAuthenticated, authLoading, profile])

  // Helper function to get auth token
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token || null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  // Make direct API call to update preferences
  const updatePreferencesViaApi = async (
    updatedPrefs: Record<string, any>
  ): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      console.log('Not authenticated, skipping API call')
      return false
    }

    console.log('Updating preferences via API:', updatedPrefs)
    try {
      const token = await getAuthToken()
      if (!token) {
        console.error('No auth token available')
        return false
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/user/${user.id}/preferences`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedPrefs),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response from API:', errorText)
        return false
      }

      const result = await response.json()
      console.log('API response:', result)
      return result.status === 'success'
    } catch (error) {
      console.error('Error updating preferences via API:', error)
      return false
    }
  }

  // Update functions for individual preferences
  const setLanguage = async (language: Locale) => {
    if (preferences.language === language) return

    // Update local state for immediate UI response
    const newPrefs = { ...preferences, language }
    setPreferences(newPrefs)

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError)
    }

    // Update backend if authenticated
    if (isAuthenticated) {
      setLoading(true)
      const success = await updatePreferencesViaApi({ language })
      setLoading(false)

      if (success) {
        toast.success(`Language changed to ${language}`)
      } else {
        toast.error('Failed to update language preference')
        // Don't revert the UI state since the local storage was updated
      }
    }
  }

  const setCurrency = async (currency: Currency) => {
    if (preferences.currency === currency) return

    // Update local state for immediate UI response
    const newPrefs = { ...preferences, currency }
    setPreferences(newPrefs)

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError)
    }

    // Update backend if authenticated
    if (isAuthenticated) {
      setLoading(true)
      const success = await updatePreferencesViaApi({ currency })
      setLoading(false)

      if (success) {
        toast.success(`Currency changed to ${currency}`)
      } else {
        toast.error('Failed to update currency preference')
      }
    }
  }

  const setCountry = async (country: Country) => {
    if (preferences.country === country) return

    // Update local state for immediate UI response
    const newPrefs = { ...preferences, country }
    setPreferences(newPrefs)

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError)
    }

    // Update backend if authenticated
    if (isAuthenticated) {
      setLoading(true)
      const success = await updatePreferencesViaApi({ country })
      setLoading(false)

      if (success) {
        toast.success(`Country changed to ${country}`)
      } else {
        toast.error('Failed to update country preference')
      }
    }
  }

  const setTheme = async (theme: string) => {
    if (preferences.theme === theme) return

    // Update local state for immediate UI response
    const newPrefs = { ...preferences, theme }
    setPreferences(newPrefs)

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError)
    }

    // Update backend if authenticated
    if (isAuthenticated) {
      setLoading(true)
      const success = await updatePreferencesViaApi({ theme })
      setLoading(false)

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
