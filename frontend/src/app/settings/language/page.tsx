// File: frontend/src/app/settings/language/page.tsx

'use client'

import { useState } from 'react'
import { useLocalization } from '@/context/LocalizationContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TestLocalizationFixes } from '@/components/TestLocalizationFixes'
import toast from 'react-hot-toast'

export default function LanguageSettingsPage() {
  const { locale, setLocale, t, languages, loading, error } = useLocalization()
  const [isSaving, setIsSaving] = useState(false)

  const handleLanguageChange = async (newLocale: 'en' | 'da') => {
    if (newLocale === locale) return

    setIsSaving(true)
    try {
      await setLocale(newLocale)
      toast.success(t('settings.changesSaved', 'Changes saved successfully'))
    } catch (error) {
      console.error('Failed to change language:', error)
      toast.error(t('settings.errorSaving', 'Error saving changes'))
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('settings.language', 'Language')}
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose your preferred language for the application.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={error ? 'destructive' : 'default'}>
            {error ? `Error: ${error}` : 'System Ready'}
          </Badge>
          <Badge variant="outline">
            Current: {languages[locale]?.displayName || locale}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language', 'Language')}</CardTitle>
          <CardDescription>
            Select your preferred language. Changes will be applied immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={locale}
            onValueChange={handleLanguageChange}
            disabled={isSaving}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {Object.entries(languages).map(([code, language]) => (
              <div key={code} className="flex items-center space-x-2">
                <RadioGroupItem value={code} id={code} />
                <Label
                  htmlFor={code}
                  className="flex items-center space-x-2 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-gray-50"
                >
                  <span className="text-2xl">{language.flag}</span>
                  <div>
                    <div className="font-medium">{language.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {language.native_name}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {isSaving && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600">
                  {t('common.save', 'Saving')}...
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Translation Test</CardTitle>
          <CardDescription>
            Test the translation system with some sample keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Common Translations</h4>
              <div className="text-sm space-y-1">
                <div>Save: {t('common.save', 'Save')}</div>
                <div>Cancel: {t('common.cancel', 'Cancel')}</div>
                <div>Loading: {t('common.loading', 'Loading...')}</div>
                <div>Error: {t('common.error', 'Error')}</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Settings Translations</h4>
              <div className="text-sm space-y-1">
                <div>Title: {t('settings.title', 'Settings')}</div>
                <div>Language: {t('settings.language', 'Language')}</div>
                <div>Theme: {t('settings.theme', 'Theme')}</div>
                <div>Profile: {t('settings.profile', 'Profile')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Development/Testing Component - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>🚧 Development Testing Panel</CardTitle>
              <CardDescription>
                This panel is only visible in development mode for testing the
                localization fixes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestLocalizationFixes />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
