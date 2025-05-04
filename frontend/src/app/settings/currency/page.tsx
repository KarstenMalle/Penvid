// File: frontend/src/app/settings/currency/page.tsx

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
import { Icons } from '@/components/ui/icons'
import toast from 'react-hot-toast'

export default function CurrencySettingsPage() {
  const { currency, setCurrency, currencies, t, formatCurrency, loading } =
    useLocalization()

  const [isChanging, setIsChanging] = useState(false)

  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === currency || isChanging) return

    setIsChanging(true)
    try {
      await setCurrency(newCurrency as any)
      toast.success(t('settings.currencyChanged'))
    } catch (error) {
      console.error('Failed to change currency:', error)
      toast.error(t('settings.failedToChangeCurrency'))
    } finally {
      setIsChanging(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-16">
          <Icons.spinner className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.currency')}</CardTitle>
          <CardDescription>{t('settings.selectCurrency')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(currencies).map(([code, currencyInfo]) => (
              <div
                key={code}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  currency === code
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                } cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800`}
                onClick={() => handleCurrencyChange(code)}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{currencyInfo.flag}</span>
                  <div>
                    <div className="font-medium">{currencyInfo.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(1000, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                {currency === code && (
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
