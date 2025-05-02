// frontend/src/services/UserPreferencesService.ts

import { ApiClient } from './ApiClient'
import {
  Locale,
  Currency,
  Country,
  defaultLocale,
  defaultCurrency,
  defaultCountry,
} from '@/i18n/config'

interface UserPreferences {
  language: Locale
  currency: Currency
  country: Country
  theme?: string
}

const defaultPreferences: UserPreferences = {
  language: defaultLocale,
  currency: defaultCurrency,
  country: defaultCountry,
  theme: 'light',
}

export const UserPreferencesService = {
  /**
   * Get user preferences from the API
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const response = await ApiClient.get(`/api/user/${userId}/preferences`)

      if (response.success && response.data) {
        return {
          language: (response.data.language as Locale) || defaultLocale,
          currency: (response.data.currency as Currency) || defaultCurrency,
          country: (response.data.country as Country) || defaultCountry,
          theme: response.data.theme || 'light',
        }
      }

      return defaultPreferences
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return defaultPreferences
    }
  },

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<boolean> {
    try {
      const response = await ApiClient.put(
        `/api/user/${userId}/preferences`,
        preferences
      )
      return response.success
    } catch (error) {
      console.error('Error updating user preferences:', error)
      return false
    }
  },

  /**
   * Get preferences from local storage
   */
  getPreferencesFromStorage(): UserPreferences {
    try {
      const storedPrefs = localStorage.getItem('user_preferences')
      if (storedPrefs) {
        return JSON.parse(storedPrefs)
      }
    } catch (error) {
      console.error('Error reading preferences from storage:', error)
    }

    return defaultPreferences
  },

  /**
   * Save preferences to local storage
   */
  savePreferencesToStorage(preferences: UserPreferences): void {
    try {
      localStorage.setItem('user_preferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('Error saving preferences to storage:', error)
    }
  },
}
