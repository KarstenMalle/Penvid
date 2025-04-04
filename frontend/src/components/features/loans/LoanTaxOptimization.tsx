// frontend/src/components/features/loans/LoanTaxOptimization.tsx
// Fixed version to address key errors and setState in render issues

import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { useLocalization } from '@/context/LocalizationContext'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { LoanType } from '@/components/features/wealth-optimizer/types'
import {
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Calculator,
  PiggyBank,
  Percent,
  Heart,
  BookOpen,
  FileText,
  MapPin,
} from 'lucide-react'

// Define prop types
interface LoanTaxOptimizationProps {
  loanId: number
  loanType: string
  loanName: string
  balance: number
  interestRate: number
  className?: string
}

// Financial rule interface
interface FinancialRule {
  tax_deductible: boolean
  deduction_rate: number
  deduction_cap: number | null
  annual_interest: number
  estimated_tax_savings: number
  recommendations: string[] | null
}

const LoanTaxOptimization: React.FC<LoanTaxOptimizationProps> = ({
  loanId,
  loanType,
  loanName,
  balance,
  interestRate,
  className,
}) => {
  const { t, currency, country, locale } = useLocalization()
  const { user, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taxInfo, setTaxInfo] = useState<FinancialRule | null>(null)
  const [countryRules, setCountryRules] = useState<any | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Only load tax information if the user is authenticated
    if (!isAuthenticated || !user) {
      setIsLoading(false)
      return
    }

    const fetchTaxInfo = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch the tax savings calculation for this specific loan
        const { data: taxData, error: taxError } = await supabase.rpc(
          'calculate_loan_tax_savings',
          { p_user_id: user.id, p_loan_id: loanId }
        )

        if (taxError) {
          console.error('Error fetching tax savings:', taxError)
          setError('loans.taxInfo.errorFetching')
          return
        }

        if (taxData && taxData.length > 0) {
          // Extract and parse recommendations which come as JSONB
          const rawRecommendations = taxData[0].recommendations
          const parsedRecommendations = Array.isArray(rawRecommendations)
            ? rawRecommendations
            : typeof rawRecommendations === 'object' &&
                rawRecommendations !== null
              ? Object.values(rawRecommendations)
              : null

          setTaxInfo({
            tax_deductible: taxData[0].tax_deductible,
            deduction_rate: taxData[0].deduction_rate,
            deduction_cap: taxData[0].deduction_cap,
            annual_interest: taxData[0].annual_interest,
            estimated_tax_savings: taxData[0].estimated_tax_savings,
            recommendations: parsedRecommendations,
          })
        }

        // Also fetch general country rules for context
        const { data: countryData, error: countryError } = await supabase
          .from('country_financial_rules')
          .select('*')
          .eq('country_code', country)
          .single()

        if (!countryError && countryData) {
          setCountryRules(countryData)
        }
      } catch (err) {
        console.error('Error in tax info fetch:', err)
        setError('loans.taxInfo.unexpectedError')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaxInfo()
  }, [isAuthenticated, user, loanId, country])

  // Calculate the annual interest directly (as a backup)
  const calculatedAnnualInterest = balance * (interestRate / 100)

  // Format the tax deduction percentage
  const formatTaxRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  // Get formatted last updated date
  const getLastUpdated = () => {
    if (countryRules?.updated_at) {
      try {
        const updateDate = new Date(countryRules.updated_at)
        return updateDate.toLocaleDateString(
          locale === 'da' ? 'da-DK' : 'en-US',
          { year: 'numeric', month: 'short', day: 'numeric' }
        )
      } catch (e) {
        return '1. apr. 2025'
      }
    }
    return '1. apr. 2025' // Fallback
  }

  // Get loan type translation key based on type
  const getLoanTypeKey = () => {
    const type = loanType.toLowerCase()
    return `loans.types.${type}`
  }

  // Memoized loan explanation to prevent render issues
  const loanExplanation = useMemo(() => {
    if (!countryRules) return ''

    if (
      loanType === LoanType.MORTGAGE_BOND &&
      countryRules?.mortgage_interest_deductible
    ) {
      return t('loans.taxInfo.mortgageBondExplanation', {
        country: countryRules.display_name,
        rate: formatTaxRate(countryRules.mortgage_interest_deduction_rate),
      })
    } else if (
      loanType === LoanType.HOME_LOAN &&
      countryRules?.mortgage_interest_deductible
    ) {
      return t('loans.taxInfo.homeLoanExplanation', {
        country: countryRules.display_name,
        rate: formatTaxRate(countryRules.mortgage_interest_deduction_rate),
      })
    } else if (
      loanType === LoanType.MORTGAGE &&
      countryRules?.mortgage_interest_deductible
    ) {
      return t('loans.taxInfo.mortgageExplanation', {
        country: countryRules.display_name,
        rate: formatTaxRate(countryRules.mortgage_interest_deduction_rate),
      })
    } else if (
      loanType === LoanType.STUDENT &&
      countryRules?.student_loan_interest_deductible
    ) {
      return t('loans.taxInfo.studentLoanExplanation', {
        country: countryRules.display_name,
      })
    } else if (
      (loanType === LoanType.PERSONAL || loanType === LoanType.AUTO) &&
      (countryRules?.personal_loan_interest_deductible ||
        countryRules?.auto_loan_interest_deductible)
    ) {
      return t('loans.taxInfo.deductibleLoanExplanation', {
        country: countryRules.display_name,
        loanType: t(getLoanTypeKey()),
        rate: formatTaxRate(countryRules.mortgage_interest_deduction_rate),
      })
    } else {
      return t('loans.taxInfo.nonDeductibleLoanExplanation', {
        country: countryRules.display_name,
        loanType: t(getLoanTypeKey()),
      })
    }
  }, [countryRules, loanType, t])

  // Memoized cap information to avoid render issues
  const capInformation = useMemo(() => {
    if (!countryRules) return null

    if (
      (loanType === LoanType.MORTGAGE ||
        loanType === LoanType.MORTGAGE_BOND ||
        loanType === LoanType.HOME_LOAN) &&
      countryRules.mortgage_interest_deductible &&
      countryRules.mortgage_interest_deduction_cap
    ) {
      return t('loans.taxInfo.mortgageDeductionCap', {
        cap: (
          <CurrencyFormatter
            key="mortgage-cap"
            value={countryRules.mortgage_interest_deduction_cap}
            minimumFractionDigits={0}
            maximumFractionDigits={0}
          />
        ),
      })
    }

    if (
      loanType === LoanType.STUDENT &&
      countryRules.student_loan_interest_deductible &&
      countryRules.student_loan_interest_deduction_cap
    ) {
      return t('loans.taxInfo.studentDeductionCap', {
        cap: (
          <CurrencyFormatter
            key="student-cap"
            value={countryRules.student_loan_interest_deduction_cap}
            minimumFractionDigits={0}
            maximumFractionDigits={0}
          />
        ),
      })
    }

    return null
  }, [countryRules, loanType, t])

  // Render loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('loans.taxInfo.title')}</CardTitle>
          <CardDescription>{t('loans.taxInfo.loading')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            {t('loans.taxInfo.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{t(error)}</p>
          <p className="mt-2 text-sm text-gray-500">
            {t('loans.taxInfo.tryAgain')}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('loans.taxInfo.title')}</CardTitle>
          <CardDescription>{t('loans.taxInfo.loginPrompt')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('loans.taxInfo.loginRequired')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-blue-600" />
              {t('loans.taxInfo.title')}
            </CardTitle>
            <CardDescription>{t('loans.taxInfo.description')}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="font-medium">
              {countryRules?.flag_emoji}{' '}
              {countryRules?.display_name ||
                t('countries.' + country + '.name')}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main tax status information */}
        <div className="rounded-lg border p-4">
          <h3 className="text-lg font-medium mb-4">
            {t('loans.taxInfo.taxStatusFor')} {loanName}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">
                {t('loans.taxInfo.annualInterest')}
              </span>
              <span className="text-xl font-bold">
                <CurrencyFormatter
                  value={taxInfo?.annual_interest || calculatedAnnualInterest}
                  minimumFractionDigits={0}
                  maximumFractionDigits={0}
                />
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-sm text-gray-500">
                {t('loans.taxInfo.deductibility')}
              </span>
              <div className="flex items-center mt-1">
                {taxInfo?.tax_deductible ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    {t('loans.taxInfo.taxDeductible')}
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 flex items-center">
                    <X className="h-3 w-3 mr-1" />
                    {t('loans.taxInfo.notDeductible')}
                  </Badge>
                )}
              </div>
            </div>

            {taxInfo?.tax_deductible && (
              <>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    {t('loans.taxInfo.deductionRate')}
                  </span>
                  <span className="text-lg font-semibold flex items-center">
                    <Percent className="h-4 w-4 mr-1 text-blue-600" />
                    {formatTaxRate(taxInfo.deduction_rate)}
                  </span>
                  {countryRules?.additional_regulations && (
                    <span className="text-xs text-gray-500 mt-1">
                      {countryRules?.display_name}{' '}
                      {t('loans.taxInfo.taxSystem')}
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    {t('loans.taxInfo.annualSavings')}
                  </span>
                  <span className="text-lg font-semibold text-green-600">
                    <CurrencyFormatter
                      value={taxInfo.estimated_tax_savings}
                      minimumFractionDigits={0}
                      maximumFractionDigits={0}
                    />
                  </span>
                  {taxInfo.deduction_cap && (
                    <span className="text-xs text-gray-500 mt-1">
                      {t('loans.taxInfo.deductionCap')}:
                      <CurrencyFormatter
                        value={taxInfo.deduction_cap}
                        minimumFractionDigits={0}
                        maximumFractionDigits={0}
                      />
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Explanation of tax rules */}
          {countryRules && (
            <div className="mt-4 pt-4 border-t text-sm">
              <h4 className="font-medium flex items-center mb-2">
                <BookOpen className="h-4 w-4 mr-1" />
                {t('loans.taxInfo.countrySpecificRules')}
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                {loanExplanation}
                {/* Add cap information if available - now rendered from memoized value */}
                {capInformation && (
                  <span key="cap-info"> {capInformation}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Tax optimization recommendations */}
        {taxInfo?.recommendations && taxInfo.recommendations.length > 0 && (
          <div className="rounded-lg border p-4">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setShowRecommendations(!showRecommendations)}
            >
              <h3 className="text-lg font-medium flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                {t('loans.taxInfo.optimizationTips')}
              </h3>
              <Button variant="ghost" size="sm">
                {showRecommendations ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showRecommendations && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('loans.taxInfo.optimizationDescription')}
                </p>

                <ul className="space-y-2">
                  {taxInfo.recommendations.map((tip, index) => (
                    <li key={`tip-${index}`} className="flex items-start">
                      <PiggyBank className="h-5 w-5 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-sm text-gray-500 pt-2 mt-2 border-t">
                  <p className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
                    {t('loans.taxInfo.disclaimer')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between bg-gray-50 dark:bg-gray-800/50 px-6 py-4 text-sm text-gray-500 rounded-b-xl">
        <div className="flex items-center">
          <FileText className="h-4 w-4 mr-1" />
          {t('loans.taxInfo.dataSourceNote')} ({getLastUpdated()})
        </div>
        <div className="flex items-center">
          <Heart className="h-4 w-4 mr-1 text-red-500" />
          {t('loans.taxInfo.updatedRegularly')}
        </div>
      </CardFooter>
    </Card>
  )
}

export default LoanTaxOptimization
