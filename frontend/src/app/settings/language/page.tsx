// src/app/settings/language/page.tsx

'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useLocalization } from '@/context/LocalizationContext'
import { Locale } from '@/i18n/config'
import { useState } from 'react'
import { Icons } from '@/components/ui/icons'

export default function LanguageSettingsPage() {
  const { locale, setLocale, t, languages } = useLocalization()
  const [isChanging, setIsChanging] = useState(false)

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale) return

    setIsChanging(true)
    try {
      await setLocale(newLocale)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
          <CardDescription>{t('settings.selectLanguage')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(languages).map(([code, language]) => (
              <div
                key={code}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  locale === code
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                } cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800`}
                onClick={() => handleLanguageChange(code as Locale)}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                </div>
                {locale === code && (
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                )}
              </div>
            ))}
          </div>

          {isChanging && (
            <div className="flex items-center justify-center">
              <Icons.spinner className="h-5 w-5 animate-spin text-blue-600" />
              <span className="ml-2">{t('common.loading')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
