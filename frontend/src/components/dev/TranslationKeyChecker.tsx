// frontend/src/components/dev/TranslationKeyChecker.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useLocalization } from '@/context/LocalizationContext'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TranslationService } from '@/services/TranslationService'
import { Locale } from '@/i18n/config'

/**
 * Component for checking and fixing missing translation keys
 * This is a development tool and should not be included in production builds
 */
export default function TranslationKeyChecker() {
  const { t, locale, isLoadingTranslations, refreshTranslations } =
    useLocalization()
  const [translationKey, setTranslationKey] = useState('')
  const [translationValue, setTranslationValue] = useState('')
  const [translationResult, setTranslationResult] = useState<string | null>(
    null
  )
  const [detectedMissingKeys, setDetectedMissingKeys] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('test')
  const [availableLocales, setAvailableLocales] = useState<string[]>([])
  const [showTranslationData, setShowTranslationData] = useState(false)
  const [translationData, setTranslationData] = useState<Record<string, any>>(
    {}
  )

  // Load available locales on mount
  useEffect(() => {
    const fetchAvailableLocales = async () => {
      try {
        const locales = await TranslationService.getAvailableLocales()
        setAvailableLocales(locales)
      } catch (error) {
        console.error('Error fetching available locales:', error)
      }
    }

    fetchAvailableLocales()
  }, [])

  // Listen for missing translation keys in console warnings
  useEffect(() => {
    const originalWarn = console.warn
    const missingKeys = new Set<string>()

    // Override console.warn to detect missing translation keys
    console.warn = function (...args) {
      const message = args[0]
      if (
        typeof message === 'string' &&
        message.includes('Translation key not found:')
      ) {
        const key = message.split('Translation key not found:')[1].trim()
        missingKeys.add(key)
        setDetectedMissingKeys(Array.from(missingKeys))
      }
      originalWarn.apply(console, args)
    }

    return () => {
      // Restore original console.warn
      console.warn = originalWarn
    }
  }, [])

  // Handle testing a translation key
  const handleTestTranslation = () => {
    if (!translationKey) return

    try {
      const result = t(translationKey)
      setTranslationResult(result)

      // Check if the result is the same as the key (missing translation)
      if (
        result === translationKey ||
        result === translationKey.split('.').pop()
      ) {
        if (!detectedMissingKeys.includes(translationKey)) {
          setDetectedMissingKeys([...detectedMissingKeys, translationKey])
        }
      }
    } catch (error) {
      console.error('Error testing translation:', error)
      setTranslationResult('Error: ' + (error as Error).message)
    }
  }

  // Handle adding a translation
  const handleAddTranslation = async () => {
    if (!translationKey || !translationValue) return

    setIsSubmitting(true)

    try {
      // Get current translations
      const currentTranslations = await TranslationService.getTranslations(
        locale as Locale
      )

      // Update with new translation
      const updatedTranslations = { ...currentTranslations }

      // Navigate to the correct location in the translations object
      const keys = translationKey.split('.')
      let current = updatedTranslations

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }

      // Set the value
      current[keys[keys.length - 1]] = translationValue

      // Send updated translations to backend
      await TranslationService.updateTranslations(
        locale as Locale,
        updatedTranslations
      )

      // Refresh translations
      await refreshTranslations()

      // Remove from missing keys
      setDetectedMissingKeys(
        detectedMissingKeys.filter((key) => key !== translationKey)
      )

      // Clear form
      setTranslationKey('')
      setTranslationValue('')
      setTranslationResult(null)

      // Show success
      toast.success('Translation added successfully')
    } catch (error) {
      console.error('Error adding translation:', error)
      toast.error('Failed to add translation')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load translation data for a specific locale
  const loadTranslationData = async (selectedLocale: Locale) => {
    try {
      const data = await TranslationService.getTranslations(selectedLocale)
      setTranslationData(data)
      setShowTranslationData(true)
    } catch (error) {
      console.error('Error loading translation data:', error)
      toast.error('Failed to load translation data')
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Translation Key Checker</CardTitle>
        <CardDescription>Test and fix missing translation keys</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="test">Test Keys</TabsTrigger>
            <TabsTrigger value="missing">
              Missing Keys
              {detectedMissingKeys.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {detectedMissingKeys.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="view">View Translations</TabsTrigger>
          </TabsList>

          <TabsContent value="test" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Input
                    placeholder="Enter translation key (e.g. common.save)"
                    value={translationKey}
                    onChange={(e) => setTranslationKey(e.target.value)}
                  />
                </div>
                <Button onClick={handleTestTranslation}>Test</Button>
              </div>

              {translationResult && (
                <div className="p-4 rounded-md bg-slate-100 dark:bg-slate-800 mt-4">
                  <p className="font-medium">Result:</p>
                  <p
                    className={`mt-1 ${translationResult === translationKey || translationResult === translationKey.split('.').pop() ? 'text-red-500' : 'text-green-500'}`}
                  >
                    {translationResult}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="missing" className="space-y-4 mt-4">
            {detectedMissingKeys.length > 0 ? (
              <div>
                <p className="mb-4">
                  The following translation keys are missing:
                </p>

                <div className="space-y-4">
                  {detectedMissingKeys.map((key) => (
                    <div key={key} className="p-4 rounded-md border">
                      <p className="font-medium text-red-500">{key}</p>

                      <div className="mt-4 grid grid-cols-1 gap-4">
                        <Input
                          placeholder={`Translation for "${key}"`}
                          value={translationKey === key ? translationValue : ''}
                          onChange={(e) => {
                            setTranslationKey(key)
                            setTranslationValue(e.target.value)
                          }}
                        />

                        <Button
                          onClick={handleAddTranslation}
                          disabled={
                            isSubmitting ||
                            translationKey !== key ||
                            !translationValue
                          }
                        >
                          {isSubmitting ? 'Adding...' : 'Add Translation'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertTitle>No missing keys detected</AlertTitle>
                <AlertDescription>
                  No missing translation keys have been detected yet. Use the
                  app and check back here if you see any translation key
                  warnings in the console.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="view" className="space-y-4 mt-4">
            <div className="mb-4">
              <p className="mb-2">Select a locale to view translations:</p>

              <div className="flex space-x-2 flex-wrap gap-2">
                {availableLocales.map((availableLocale) => (
                  <Button
                    key={availableLocale}
                    variant={availableLocale === locale ? 'default' : 'outline'}
                    onClick={() =>
                      loadTranslationData(availableLocale as Locale)
                    }
                  >
                    {availableLocale.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {showTranslationData && Object.keys(translationData).length > 0 && (
              <div className="mt-4">
                <p className="font-medium mb-2">Translation Data:</p>
                <pre className="p-4 rounded-md bg-slate-100 dark:bg-slate-800 overflow-auto max-h-96">
                  {JSON.stringify(translationData, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={refreshTranslations}
          disabled={isLoadingTranslations}
        >
          {isLoadingTranslations ? 'Refreshing...' : 'Refresh Translations'}
        </Button>

        <div className="text-sm text-gray-500">
          Current locale: <Badge variant="outline">{locale}</Badge>
        </div>
      </CardFooter>
    </Card>
  )
}
