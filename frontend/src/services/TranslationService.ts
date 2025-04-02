// frontend/src/services/TranslationService.ts

import { Locale } from '@/i18n/config'

/**
 * Service for fetching translations from the backend API
 */
export class TranslationService {
  private static cache: Record<string, any> = {}
  private static fallbackLocale: Locale = 'en'

  // Base API URL from environment variable or fallback
  private static API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'

  /**
   * Get available translation locales
   */
  static async getAvailableLocales(): Promise<string[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/translations`)

      if (!response.ok) {
        throw new Error(
          `Failed to fetch available locales: ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.available_locales || []
    } catch (error) {
      console.error('Error fetching available locales:', error)
      return ['en'] // Default fallback
    }
  }

  /**
   * Get translations for a specific locale
   * Uses caching to avoid unnecessary requests
   */
  static async getTranslations(
    locale: Locale,
    forceRefresh = false
  ): Promise<Record<string, any>> {
    // Check cache first unless forced refresh
    if (!forceRefresh && this.cache[locale]) {
      return this.cache[locale]
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/translations/${locale}`
      )

      if (!response.ok) {
        // If the requested locale isn't available, fall back to default
        if (response.status === 404 && locale !== this.fallbackLocale) {
          console.warn(
            `Translations for ${locale} not found, falling back to ${this.fallbackLocale}`
          )
          return this.getTranslations(this.fallbackLocale)
        }

        throw new Error(`Failed to fetch translations: ${response.statusText}`)
      }

      const translations = await response.json()

      // Cache the result
      this.cache[locale] = translations

      return translations
    } catch (error) {
      console.error(`Error fetching translations for ${locale}:`, error)

      // If there's an error and we're not already trying the fallback, use fallback
      if (locale !== this.fallbackLocale) {
        console.warn(
          `Falling back to ${this.fallbackLocale} translations due to error`
        )
        return this.getTranslations(this.fallbackLocale)
      }

      // If all else fails, return an empty object to avoid crashing
      return {}
    }
  }

  /**
   * Get a specific translation by key path
   * @param locale The locale to use
   * @param key Dot-notation path to the translation (e.g., "common.save")
   * @param params Optional parameters to replace in the translation
   */
  static async getTranslation(
    locale: Locale,
    key: string,
    params?: Record<string, any>
  ): Promise<string> {
    // Get the full translations object for this locale
    const translations = await this.getTranslations(locale)

    // Split the key into path segments
    const keys = key.split('.')

    // Navigate through the translations object
    let value: any = translations
    for (const segment of keys) {
      if (!value || typeof value !== 'object') {
        return key // Key path is invalid, return the key itself
      }

      value = value[segment]

      if (value === undefined) {
        // If not found and not using fallback, try fallback locale
        if (locale !== this.fallbackLocale) {
          return this.getTranslation(this.fallbackLocale, key, params)
        }

        return key // If not found in fallback either, return the key itself
      }
    }

    // If the value is not a string, or is empty, return the key
    if (typeof value !== 'string' || !value) {
      return key
    }

    // Replace parameters if provided
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue))
      }, value)
    }

    return value
  }

  /**
   * Clear the translation cache
   */
  static clearCache(): void {
    this.cache = {}
  }

  /**
   * Set the fallback locale
   */
  static setFallbackLocale(locale: Locale): void {
    this.fallbackLocale = locale
  }
}
