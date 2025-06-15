// File: frontend/src/utils/debug-api.ts
// Debugging utility for testing API connections

import { apiClient } from '@/services/ApiClient'
import { API_ENDPOINTS } from '@/config/api'
import { createClient } from '@/lib/supabase-browser'

export class DebugApiHelper {
  static async testBackendConnection() {
    console.log('🔍 Testing backend connection...')

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/health`
      )
      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Backend connection successful:', data)
        return true
      } else {
        console.error('❌ Backend connection failed:', data)
        return false
      }
    } catch (error) {
      console.error('❌ Backend connection error:', error)
      return false
    }
  }

  static async testAuthToken() {
    console.log('🔍 Testing authentication token...')

    try {
      const supabase = createClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ Auth session error:', error)
        return null
      }

      if (session?.access_token) {
        console.log('✅ Auth token found:', {
          user: session.user.email,
          expires: new Date(session.expires_at! * 1000).toISOString(),
          tokenLength: session.access_token.length,
        })
        return session.access_token
      } else {
        console.warn('⚠️ No auth token found')
        return null
      }
    } catch (error) {
      console.error('❌ Auth token test error:', error)
      return null
    }
  }

  static async testTranslationsApi() {
    console.log('🔍 Testing translations API...')

    const locales = ['en', 'da']
    const results: Record<string, any> = {}

    for (const locale of locales) {
      try {
        const response = await apiClient.get(
          API_ENDPOINTS.translations.get(locale)
        )

        if (response.success) {
          const translationCount = Object.keys(
            response.data?.translations || {}
          ).length
          console.log(`✅ Translations for ${locale}:`, {
            success: true,
            count: translationCount,
            sample: Object.keys(response.data?.translations || {}).slice(0, 3),
          })
          results[locale] = { success: true, count: translationCount }
        } else {
          console.error(`❌ Translations for ${locale} failed:`, response.error)
          results[locale] = { success: false, error: response.error }
        }
      } catch (error: any) {
        console.error(`❌ Translations for ${locale} error:`, error)
        results[locale] = { success: false, error: error.message }
      }
    }

    return results
  }

  static async testAvailableLocales() {
    console.log('🔍 Testing available locales API...')

    try {
      const response = await apiClient.get(API_ENDPOINTS.translations.available)

      if (response.success && response.data?.locales) {
        console.log('✅ Available locales:', response.data.locales)
        return response.data.locales
      } else {
        console.error('❌ Available locales failed:', response.error)
        return null
      }
    } catch (error) {
      console.error('❌ Available locales error:', error)
      return null
    }
  }

  static async testUserPreferences() {
    console.log('🔍 Testing user preferences API...')

    const token = await this.testAuthToken()
    if (!token) {
      console.warn('⚠️ Skipping preferences test - no auth token')
      return null
    }

    try {
      // Test GET preferences
      apiClient.setAuthToken(token)
      const getResponse = await apiClient.get(API_ENDPOINTS.preferences.get)

      if (getResponse.success) {
        console.log(
          '✅ Get preferences successful:',
          getResponse.data?.preferences
        )

        // Test UPDATE preferences
        const updateResponse = await apiClient.post(
          API_ENDPOINTS.preferences.update,
          {
            locale: 'en', // Test update
          }
        )

        if (updateResponse.success) {
          console.log(
            '✅ Update preferences successful:',
            updateResponse.data?.preferences
          )
          return { get: true, update: true }
        } else {
          console.error('❌ Update preferences failed:', updateResponse.error)
          return { get: true, update: false, updateError: updateResponse.error }
        }
      } else {
        console.error('❌ Get preferences failed:', getResponse.error)
        return { get: false, error: getResponse.error }
      }
    } catch (error: any) {
      console.error('❌ User preferences test error:', error)
      return { get: false, error: error.message }
    }
  }

  static async runFullDiagnostics() {
    console.log('🚀 Running full API diagnostics...')
    console.log('=====================================')

    const results = {
      backend: await this.testBackendConnection(),
      auth: await this.testAuthToken(),
      translations: await this.testTranslationsApi(),
      locales: await this.testAvailableLocales(),
      preferences: await this.testUserPreferences(),
    }

    console.log('=====================================')
    console.log('📊 Diagnostics Summary:')
    console.table({
      'Backend Connection': results.backend ? '✅ OK' : '❌ FAIL',
      Authentication: results.auth ? '✅ OK' : '⚠️ No Token',
      'English Translations': results.translations?.en?.success
        ? '✅ OK'
        : '❌ FAIL',
      'Danish Translations': results.translations?.da?.success
        ? '✅ OK'
        : '❌ FAIL',
      'Available Locales': results.locales ? '✅ OK' : '❌ FAIL',
      'User Preferences': results.preferences?.get ? '✅ OK' : '❌ FAIL',
    })

    return results
  }

  static async testLanguageSwitch(newLocale: 'en' | 'da') {
    console.log(`🔄 Testing language switch to ${newLocale}...`)

    const token = await this.testAuthToken()
    if (token) {
      apiClient.setAuthToken(token)
    }

    try {
      // Test fetching translations for new locale
      const translationsResponse = await apiClient.get(
        API_ENDPOINTS.translations.get(newLocale)
      )

      if (!translationsResponse.success) {
        console.error(
          `❌ Failed to fetch ${newLocale} translations:`,
          translationsResponse.error
        )
        return false
      }

      console.log(`✅ ${newLocale} translations loaded:`, {
        count: Object.keys(translationsResponse.data?.translations || {})
          .length,
      })

      // Test updating user preference if authenticated
      if (token) {
        const preferencesResponse = await apiClient.post(
          API_ENDPOINTS.preferences.update,
          {
            locale: newLocale,
          }
        )

        if (preferencesResponse.success) {
          console.log(`✅ User preference updated to ${newLocale}`)
          return true
        } else {
          console.error(
            `❌ Failed to update user preference:`,
            preferencesResponse.error
          )
          return false
        }
      } else {
        console.log(
          `✅ Language switch test completed (no user preference update - not authenticated)`
        )
        return true
      }
    } catch (error) {
      console.error(`❌ Language switch test error:`, error)
      return false
    }
  }
}

// Make it available globally for browser console debugging
if (typeof window !== 'undefined') {
  ;(window as any).debugApi = DebugApiHelper
}

export default DebugApiHelper
