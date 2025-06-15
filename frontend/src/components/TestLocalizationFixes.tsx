// File: frontend/src/components/TestLocalizationFixes.tsx
// Component for testing the localization fixes
// Add this to your settings page temporarily to test everything

'use client'

import { useState } from 'react'
import { useLocalization } from '@/context/LocalizationContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import DebugApiHelper from '@/utils/debug-api'

export function TestLocalizationFixes() {
  const { locale, setLocale, t, loading, error } = useLocalization()
  const [testResults, setTestResults] = useState<any>(null)
  const [isRunningTests, setIsRunningTests] = useState(false)

  const runDiagnostics = async () => {
    setIsRunningTests(true)
    try {
      const results = await DebugApiHelper.runFullDiagnostics()
      setTestResults(results)
    } catch (error) {
      console.error('Diagnostics error:', error)
    }
    setIsRunningTests(false)
  }

  const testLanguageSwitch = async (newLocale: 'en' | 'da') => {
    try {
      await setLocale(newLocale)
      console.log(`Language switched to ${newLocale}`)
    } catch (error) {
      console.error('Language switch error:', error)
    }
  }

  const testSpecificEndpoint = async (endpoint: string) => {
    try {
      console.log(`Testing endpoint: ${endpoint}`)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${endpoint}`
      )
      const data = await response.json()
      console.log('Response:', data)
    } catch (error) {
      console.error('Endpoint test error:', error)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Localization System Test Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={loading ? 'secondary' : 'default'}>
              Status: {loading ? 'Loading' : 'Ready'}
            </Badge>
            <Badge variant={error ? 'destructive' : 'default'}>
              Error: {error || 'None'}
            </Badge>
            <Badge variant="outline">Current Locale: {locale}</Badge>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Test Translation Function</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Key: common.save</div>
              <div>Value: {t('common.save', 'Save')}</div>
              <div>Key: settings.language</div>
              <div>Value: {t('settings.language', 'Language')}</div>
              <div>Key: nonexistent.key</div>
              <div>Value: {t('nonexistent.key', 'Default Value')}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Test Language Switching</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => testLanguageSwitch('en')}
                variant={locale === 'en' ? 'default' : 'outline'}
                size="sm"
              >
                Switch to English
              </Button>
              <Button
                onClick={() => testLanguageSwitch('da')}
                variant={locale === 'da' ? 'default' : 'outline'}
                size="sm"
              >
                Switch to Danish
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">API Diagnostics</h3>
            <Button
              onClick={runDiagnostics}
              disabled={isRunningTests}
              size="sm"
            >
              {isRunningTests ? 'Running Tests...' : 'Run Full Diagnostics'}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Test Individual Endpoints</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => testSpecificEndpoint('/health')}
                variant="outline"
                size="sm"
              >
                Test Health
              </Button>
              <Button
                onClick={() => testSpecificEndpoint('/translations/en')}
                variant="outline"
                size="sm"
              >
                Test EN Translations
              </Button>
              <Button
                onClick={() => testSpecificEndpoint('/translations/da')}
                variant="outline"
                size="sm"
              >
                Test DA Translations
              </Button>
              <Button
                onClick={() => testSpecificEndpoint('/translations/available')}
                variant="outline"
                size="sm"
              >
                Test Available Locales
              </Button>
            </div>
          </div>

          {testResults && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Test Results</h3>
              <div className="bg-gray-100 p-4 rounded text-xs">
                <pre>{JSON.stringify(testResults, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Debugging Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>
              <strong>Open browser console and run:</strong>
            </p>
            <div className="bg-gray-100 p-2 rounded font-mono">
              <div>debugApi.runFullDiagnostics()</div>
              <div>debugApi.testLanguageSwitch('da')</div>
              <div>debugApi.testBackendConnection()</div>
              <div>debugApi.testUserPreferences()</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
