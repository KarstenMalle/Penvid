// frontend/src/services/TranslationService.ts

import { Locale } from '@/i18n/config'
import { ApiClient } from './ApiClient'

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
      return ['en', 'da'] // Default fallback
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
    // Normalize locale to lowercase
    const normalizedLocale = locale.toLowerCase() as Locale

    // Check cache first unless forced refresh
    if (!forceRefresh && this.cache[normalizedLocale]) {
      return this.cache[normalizedLocale]
    }

    try {
      console.log(`Fetching translations for ${normalizedLocale}...`)
      const response = await fetch(
        `${this.API_BASE_URL}/translations/${normalizedLocale}`
      )

      if (!response.ok) {
        // If the requested locale isn't available, fall back to default
        if (
          response.status === 404 &&
          normalizedLocale !== this.fallbackLocale
        ) {
          console.warn(
            `Translations for ${normalizedLocale} not found, falling back to ${this.fallbackLocale}`
          )
          return this.getTranslations(this.fallbackLocale)
        }

        throw new Error(`Failed to fetch translations: ${response.statusText}`)
      }

      const translations = await response.json()
      console.log(
        `Successfully fetched translations for ${normalizedLocale}`,
        translations.loans
          ? `(includes ${Object.keys(translations.loans).length} loan keys)`
          : '(no loan keys)'
      )

      // Cache the result
      this.cache[normalizedLocale] = translations

      return translations
    } catch (error) {
      console.error(
        `Error fetching translations for ${normalizedLocale}:`,
        error
      )

      // If there's an error and we're not already trying the fallback, use fallback
      if (normalizedLocale !== this.fallbackLocale) {
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
        console.warn(
          `Translation path broken at '${segment}' in key '${key}' for locale '${locale}'`
        )
        return key // Key path is invalid, return the key itself
      }

      value = value[segment]

      if (value === undefined) {
        console.warn(
          `Translation key '${key}' not found for locale '${locale}'`
        )

        // If not found and not using fallback, try fallback locale
        if (locale !== this.fallbackLocale) {
          return this.getTranslation(this.fallbackLocale, key, params)
        }

        return key // If not found in fallback either, return the key itself
      }
    }

    // If the value is not a string, or is empty, return the key
    if (typeof value !== 'string' || !value) {
      console.warn(
        `Translation value for key '${key}' is not a string or is empty`
      )
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
   * Synchronous version of getTranslation that uses the cache
   * (Returns key itself if translation not in cache)
   */
  static getTranslationSync(
    locale: Locale,
    key: string,
    params?: Record<string, any>
  ): string {
    // Use cached translations if available
    const normalizedLocale = locale.toLowerCase() as Locale
    if (!this.cache[normalizedLocale]) {
      // Start fetching translations for next time, but return key for now
      this.getTranslations(normalizedLocale).catch((err) =>
        console.error(
          `Background translation fetch failed for ${normalizedLocale}:`,
          err
        )
      )
      return this.formatKeyAsPlaceholder(key, params)
    }

    const translations = this.cache[normalizedLocale]

    // Split the key into path segments
    const keys = key.split('.')

    // Navigate through the translations object
    let value: any = translations
    for (const segment of keys) {
      if (!value || typeof value !== 'object') {
        return this.formatKeyAsPlaceholder(key, params)
      }
      value = value[segment]
      if (value === undefined) {
        // Try fallback if available
        if (
          normalizedLocale !== this.fallbackLocale &&
          this.cache[this.fallbackLocale]
        ) {
          let fallbackValue = this.cache[this.fallbackLocale]
          let found = true
          for (const seg of keys) {
            if (!fallbackValue || typeof fallbackValue !== 'object') {
              found = false
              break
            }
            fallbackValue = fallbackValue[seg]
            if (fallbackValue === undefined) {
              found = false
              break
            }
          }
          if (found && typeof fallbackValue === 'string' && fallbackValue) {
            if (params) {
              return Object.entries(params).reduce(
                (str, [paramKey, paramValue]) => {
                  return str.replace(
                    new RegExp(`{${paramKey}}`, 'g'),
                    String(paramValue)
                  )
                },
                fallbackValue
              )
            }
            return fallbackValue
          }
        }
        return this.formatKeyAsPlaceholder(key, params)
      }
    }

    // If the value is not a string or is empty, return formatted key
    if (typeof value !== 'string' || !value) {
      return this.formatKeyAsPlaceholder(key, params)
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
   * Format a key as a reasonable placeholder when translation is not found
   */
  private static formatKeyAsPlaceholder(
    key: string,
    params?: Record<string, any>
  ): string {
    // Get the last part of the key (e.g., "save" from "common.save")
    const lastPart = key.split('.').pop() || key

    // Convert camelCase or snake_case to Title Case Words
    const formatted = lastPart
      .replace(/([A-Z])/g, ' $1') // Split on uppercase letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
      .trim()

    // Apply any parameters
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue))
      }, formatted)
    }

    return formatted
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
