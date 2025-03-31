// src/app/settings/country/page.tsx

'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useLocalization } from '@/context/LocalizationContext'
import { Country } from '@/i18n/config'
import { useState } from 'react'
import { Icons } from '@/components/ui/icons'

export default function CountrySettingsPage() {
  const { country, setCountry, t, countries, formatCurrency } =
    useLocalization()
  const [isChanging, setIsChanging] = useState(false)

  const handleCountryChange = async (newCountry: Country) => {
    if (newCountry === country) return

    setIsChanging(true)
    try {
      await setCountry(newCountry)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.country')}</CardTitle>
          <CardDescription>{t('settings.selectCountry')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(countries).map(([code, countryInfo]) => (
              <div
                key={code}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  country === code
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                } cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800`}
                onClick={() => handleCountryChange(code as Country)}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{countryInfo.flag}</span>
                  <div>
                    <div className="font-medium">{countryInfo.name}</div>
                    <div className="text-sm text-gray-500">
                      {t(`countries.${code}.description`)}
                    </div>
                  </div>
                </div>
                {country === code && (
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

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.countryFinancialRules')}</CardTitle>
          <CardDescription>{t('settings.ruleDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">
                  {t('settings.mortgageRules')}
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span
                      className={
                        countries[country].rules.mortgageInterestDeductible
                          ? 'text-green-500 mr-2'
                          : 'text-red-500 mr-2'
                      }
                    >
                      {countries[country].rules.mortgageInterestDeductible
                        ? '✓'
                        : '✗'}
                    </span>
                    <span>{t('settings.mortgageInterestDeductible')}</span>
                  </li>
                  {countries[country].rules.maxMortgageInterestDeduction && (
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">ℹ</span>
                      <span>
                        {t('settings.maxMortgageDeduction')}:{' '}
                        {formatCurrency(
                          countries[country].rules.maxMortgageInterestDeduction
                        )}
                      </span>
                    </li>
                  )}
                  {countries[country].rules.mortgageInterestDeductionRate && (
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">ℹ</span>
                      <span>
                        {t('settings.deductionRate')}:{' '}
                        {(
                          countries[country].rules
                            .mortgageInterestDeductionRate * 100
                        ).toFixed(0)}
                        %
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">
                  {t('settings.studentLoanRules')}
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span
                      className={
                        countries[country].rules.studentLoanInterestDeductible
                          ? 'text-green-500 mr-2'
                          : 'text-red-500 mr-2'
                      }
                    >
                      {countries[country].rules.studentLoanInterestDeductible
                        ? '✓'
                        : '✗'}
                    </span>
                    <span>{t('settings.studentLoanInterestDeductible')}</span>
                  </li>
                  {countries[country].rules.maxStudentLoanInterestDeduction && (
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">ℹ</span>
                      <span>
                        {t('settings.maxStudentDeduction')}:{' '}
                        {formatCurrency(
                          countries[country].rules
                            .maxStudentLoanInterestDeduction
                        )}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">
                {t('settings.countryRuleNote')}
              </p>
              <p>{t('settings.countryRuleExplanation')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
