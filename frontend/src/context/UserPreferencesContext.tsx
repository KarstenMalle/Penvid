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
      console.log('Loading user preferences...')

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
        } else if (isAuthenticated && user && !profile) {
          // If authenticated but no profile in context, try to fetch from the server
          console.log('No profile in context, fetching from server...')
          try {
            const response = await ApiClient.get(
              `/api/user/${user.id}/preferences`,
              {
                requestId: 'fetch-preferences',
              }
            )

            if (response.success && response.data) {
              console.log(
                'Successfully fetched preferences from server:',
                response.data
              )
              const serverPrefs: UserPreferences = {
                language: (response.data.language as Locale) || defaultLocale,
                currency:
                  (response.data.currency as Currency) || defaultCurrency,
                country: (response.data.country as Country) || defaultCountry,
                theme: response.data.theme || 'light',
              }

              setPreferences(serverPrefs)

              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(serverPrefs))
              } catch (storageError) {
                console.error(
                  'Error saving server preferences to localStorage:',
                  storageError
                )
              }

              prefsLoaded = true
            } else {
              console.log(
                'Failed to fetch preferences from server:',
                response.error
              )
            }
          } catch (error) {
            console.error('Error fetching preferences from server:', error)
          }
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
    if (isAuthenticated && user) {
      setLoading(true)
      try {
        const response = await ApiClient.put(
          `/api/user/${user.id}/preferences`,
          { language },
          { requestId: 'update-language' }
        )

        if (!response.success) {
          console.error('Error updating language preference:', response.error)
          toast.error('Failed to update language preference')
        } else {
          toast.success(`Language changed to ${language}`)
        }
      } catch (error) {
        console.error('Error updating language preference:', error)
        toast.error('Failed to update language preference')
      } finally {
        setLoading(false)
      }
    } else {
      toast.success(`Language changed to ${language}`)
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
    if (isAuthenticated && user) {
      setLoading(true)
      try {
        const response = await ApiClient.put(
          `/api/user/${user.id}/preferences`,
          { currency },
          { requestId: 'update-currency' }
        )

        if (!response.success) {
          console.error('Error updating currency preference:', response.error)
          toast.error('Failed to update currency preference')
        } else {
          toast.success(`Currency changed to ${currency}`)
        }
      } catch (error) {
        console.error('Error updating currency preference:', error)
        toast.error('Failed to update currency preference')
      } finally {
        setLoading(false)
      }
    } else {
      toast.success(`Currency changed to ${currency}`)
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
    if (isAuthenticated && user) {
      setLoading(true)
      try {
        const response = await ApiClient.put(
          `/api/user/${user.id}/preferences`,
          { country },
          { requestId: 'update-country' }
        )

        if (!response.success) {
          console.error('Error updating country preference:', response.error)
          toast.error('Failed to update country preference')
        } else {
          toast.success(`Country changed to ${country}`)
        }
      } catch (error) {
        console.error('Error updating country preference:', error)
        toast.error('Failed to update country preference')
      } finally {
        setLoading(false)
      }
    } else {
      toast.success(`Country changed to ${country}`)
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
    if (isAuthenticated && user) {
      setLoading(true)
      try {
        const response = await ApiClient.put(
          `/api/user/${user.id}/preferences`,
          { theme },
          { requestId: 'update-theme' }
        )

        if (!response.success) {
          console.error('Error updating theme preference:', response.error)
          toast.error('Failed to update theme preference')
        }
      } catch (error) {
        console.error('Error updating theme preference:', error)
        toast.error('Failed to update theme preference')
      } finally {
        setLoading(false)
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
