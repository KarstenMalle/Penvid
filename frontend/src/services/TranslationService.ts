// frontend/src/services/TranslationService.ts

import axios from 'axios'
import { Locale } from '@/i18n/config'

/**
 * Service for fetching translations from the backend API
 */
class TranslationService {
  private static instance: TranslationService
  private static cache: Record<string, Record<string, any>> = {}
  private static loadingPromises: Record<string, Promise<Record<string, any>>> = {}
  private static fallbackLocale: Locale = 'en'
  private static lastFetchTime: Record<string, number> = {}
  private static CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Base API URL from environment variable or fallback
  private static API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'

  private constructor() {}

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService()
    }
    return TranslationService.instance
  }

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
    // If we have cached translations and not forcing refresh, return them
    if (!forceRefresh && TranslationService.cache[locale]) {
      return TranslationService.cache[locale]
    }

    // If we're already loading this locale, return the existing promise
    if (TranslationService.loadingPromises[locale]) {
      return TranslationService.loadingPromises[locale]
    }

    // Create a new loading promise
    TranslationService.loadingPromises[locale] = (async () => {
      try {
        const response = await axios.get(`${this.API_BASE_URL}/translations/${locale}`)
        const translations = response.data.data
        TranslationService.cache[locale] = translations
        return translations
      } catch (error) {
        console.error(`Error loading translations for ${locale}:`, error)
        throw error
      } finally {
        delete TranslationService.loadingPromises[locale]
      }
    })()

    return TranslationService.loadingPromises[locale]
  }

  static getTranslationSync(
    locale: Locale,
    key: string,
    params?: Record<string, any>
  ): string {
    const translations = TranslationService.cache[locale]
    if (!translations) {
      return key
    }

    const keys = key.split('.')
    let value: any = translations

    for (const k of keys) {
      if (!value || typeof value !== 'object') {
        return key
      }
      value = value[k]
    }

    if (typeof value !== 'string') {
      return key
    }

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
    TranslationService.cache = {}
  }

  /**
   * Set the fallback locale
   */
  static setFallbackLocale(locale: Locale): void {
    this.fallbackLocale = locale
  }
}

export { TranslationService }
