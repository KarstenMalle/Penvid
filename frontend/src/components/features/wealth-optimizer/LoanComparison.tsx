import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatTimeSpan } from './format-utils'
import { LoanStrategyComparison } from './types'
import { useLocalization } from '@/context/LocalizationContext'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock,
  Info,
  Shield,
  BarChart4,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface LoanComparisonProps {
  comparisons: LoanStrategyComparison[]
  spReturn: number
  riskFactor?: number
}

/**
 * Component to display loan-by-loan comparison from API data
 * This component is responsible only for displaying data from the backend;
 * it does not perform any calculations
 */
const LoanComparison: React.FC<LoanComparisonProps> = ({
  comparisons,
  spReturn,
  riskFactor = 0.7, // Default risk factor (only for display)
}) => {
  const { t, locale } = useLocalization()

  // Calculate risk-adjusted return for display purposes only
  const riskAdjustedReturn = spReturn * riskFactor

  // If no comparisons, show empty state
  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="p-6 text-center border rounded-md bg-gray-50 dark:bg-gray-800">
        <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-4" />
        <h3 className="font-medium text-lg mb-2">
          {t('loanComparison.noLoansToCompare')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('wealthOptimizer.selectAtLeastOneLoan')}
        </p>
      </div>
    )
  }

  // Sort comparisons by interest rate (highest first) for better presentation
  // This is just UI sorting, not calculation
  const sortedComparisons = [...comparisons].sort(
    (a, b) => b.interestRate - a.interestRate
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">
          {t('loanComparison.loanByLoanStrategy')}
        </h3>

        {/* Risk adjustment explanation panel */}
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
          <div className="flex items-center mb-2">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="font-medium">
              {t('loanComparison.fairComparisonExplanation')}
            </h4>
          </div>
          <p className="text-sm mb-3">
            {t('loanComparison.fairComparisonDescription')}
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center p-2 bg-green-50 dark:bg-green-900/10 rounded">
              <Clock className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
              <span>{t('loanComparison.shortTermDescription')}</span>
            </div>
            <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded">
              <BarChart4 className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
              <span>
                {t('loanComparison.fullTermDescription', { years: 30 })}
              </span>
            </div>
          </div>

          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/10 rounded text-sm">
            <div className="flex items-center mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
              <span className="font-medium">
                {t('loanComparison.importantNote')}
              </span>
            </div>
            <p>{t('loanComparison.fairComparisonNote')}</p>
          </div>
        </div>

        {/* Risk adjustment panel */}
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
            <h4 className="font-medium">
              {t('loanComparison.riskAdjustedAnalysis')}
            </h4>
          </div>
          <p className="text-sm">
            {t('loanComparison.riskAdjustedExplanation', {
              spReturn: spReturn.toFixed(2),
              riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
            })}
          </p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center p-2 bg-green-50 dark:bg-green-900/10 rounded">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
              <span>
                {t('loanComparison.highInterestLoanStrategy', {
                  threshold: (spReturn + 1).toFixed(1),
                })}
              </span>
            </div>
            <div className="flex items-center p-2 bg-amber-50 dark:bg-amber-900/10 rounded">
              <AlertCircle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
              <span>
                {t('loanComparison.mediumInterestLoanStrategy', {
                  lower: riskAdjustedReturn.toFixed(1),
                  upper: spReturn.toFixed(1),
                })}
              </span>
            </div>
            <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded">
              <TrendingUp className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
              <span>
                {t('loanComparison.lowInterestLoanStrategy', {
                  threshold: riskAdjustedReturn.toFixed(1),
                })}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('loanComparison.breakdown')}
        </p>
      </div>

      {sortedComparisons.map((comparison) => {
        // Get recommendation directly from the API, or derive it based on interest rate
        const recommendationType =
          comparison.recommendation ||
          (comparison.interestRate > spReturn + 1
            ? 'definitely-pay'
            : comparison.interestRate > riskAdjustedReturn
              ? 'probably-pay'
              : 'invest-instead')

        // Is paying down better than investing? (directly from API)
        const payingDownBetter = comparison.payingDownIsBetter

        // Style class based on recommendation
        const betterStrategyClass = payingDownBetter
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'

        // Card border color based on recommendation
        const cardBorderClass =
          recommendationType === 'definitely-pay'
            ? 'border-green-200 dark:border-green-900'
            : recommendationType === 'probably-pay'
              ? 'border-amber-200 dark:border-amber-900'
              : 'border-blue-200 dark:border-blue-900'

        // Get strategy info based on recommendation type
        const strategyInfo = {
          icon:
            recommendationType === 'definitely-pay' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : recommendationType === 'probably-pay' ? (
              <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
            ) : (
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            ),
          title: t(`loanComparison.${recommendationType.replace('-', '')}`),
          description:
            recommendationType === 'definitely-pay'
              ? t('loanComparison.definitelyPayDownDesc')
              : recommendationType === 'probably-pay'
                ? t('loanComparison.probablyPayDownDesc', {
                    loanRate: comparison.interestRate.toFixed(2),
                    spReturn: spReturn.toFixed(2),
                    riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
                  })
                : t('loanComparison.investInsteadDesc', {
                    loanRate: comparison.interestRate.toFixed(2),
                    riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
                  }),
        }

        return (
          <Card key={comparison.loanId} className={cardBorderClass}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center">
                  {comparison.loanName}
                  <Badge className={`ml-3 ${betterStrategyClass}`}>
                    {payingDownBetter
                      ? t('loanComparison.payDownFirst')
                      : t('loanComparison.investInstead')}
                  </Badge>
                </CardTitle>
                <div
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    recommendationType === 'definitely-pay'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : recommendationType === 'probably-pay'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                  }`}
                >
                  {t(`loanComparison.${recommendationType}`)}
                </div>
              </div>
              <CardDescription>
                {comparison.interestRate.toFixed(2)}% {t('loans.interestRate')}{' '}
                •{' '}
                <CurrencyFormatter
                  value={comparison.originalBalance}
                  originalCurrency="USD"
                />{' '}
                {t('loans.balance')} •{' '}
                <CurrencyFormatter
                  value={comparison.minimumPayment}
                  originalCurrency="USD"
                  minimumFractionDigits={2}
                  maximumFractionDigits={2}
                />
                /{t('loanComparison.month')} {t('loanComparison.minimum')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                {/* Tabs for switching between short-term and long-term comparisons */}
                <Tabs defaultValue="short-term" className="w-full">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="short-term">
                      {t('loanComparison.shortTermComparison')}
                    </TabsTrigger>
                    <TabsTrigger value="full-term">
                      {t('loanComparison.fullTermComparison')}
                    </TabsTrigger>
                  </TabsList>

                  {/* Short-term comparison (same timeframe) */}
                  <TabsContent value="short-term" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">
                          {t('loanComparison.ifYouPayMinimums')}
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between">
                            <span>{t('loanComparison.monthlyPayment')}</span>
                            <span className="font-medium">
                              <CurrencyFormatter
                                value={comparison.minimumPayment}
                                originalCurrency="USD"
                                minimumFractionDigits={2}
                                maximumFractionDigits={2}
                              />
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span>{t('loanComparison.timeToPayoff')}</span>
                            <span className="font-medium">
                              {formatTimeSpan(
                                comparison.baselinePayoff.payoffTimeMonths,
                                locale
                              )}
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span>{t('loanComparison.totalInterestPaid')}</span>
                            <span className="font-medium text-red-600">
                              <CurrencyFormatter
                                value={
                                  comparison.baselinePayoff.totalInterestPaid
                                }
                                originalCurrency="USD"
                              />
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span>
                              {t('loanComparison.extraMoneyCouldEarn')}
                            </span>
                            <span className="font-medium text-green-600">
                              <CurrencyFormatter
                                value={comparison.potentialInvestmentGrowth}
                                originalCurrency="USD"
                              />
                            </span>
                          </li>
                          <li className="flex justify-between border-t pt-1 mt-1">
                            <span>
                              {t('loanComparison.riskAdjustedEarnings')}
                            </span>
                            <span className="font-medium text-blue-600">
                              <CurrencyFormatter
                                value={
                                  comparison.riskAdjustedGrowth ||
                                  comparison.potentialInvestmentGrowth *
                                    riskFactor
                                }
                                originalCurrency="USD"
                              />
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">
                          {t('loanComparison.ifYouPayDownAggressively')}
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between">
                            <span>{t('loanComparison.monthlyPayment')}</span>
                            <span className="font-medium">
                              <CurrencyFormatter
                                value={
                                  comparison.minimumPayment +
                                  comparison.extraMonthlyPayment
                                }
                                originalCurrency="USD"
                                minimumFractionDigits={2}
                                maximumFractionDigits={2}
                              />
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span>{t('loanComparison.timeToPayoff')}</span>
                            <span className="font-medium">
                              {formatTimeSpan(
                                comparison.acceleratedPayoff.payoffTimeMonths,
                                locale
                              )}
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span>{t('loanComparison.totalInterestPaid')}</span>
                            <span className="font-medium text-red-600">
                              <CurrencyFormatter
                                value={
                                  comparison.acceleratedPayoff.totalInterestPaid
                                }
                                originalCurrency="USD"
                              />
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span>{t('loanComparison.interestSaved')}</span>
                            <span className="font-medium text-green-600">
                              <CurrencyFormatter
                                value={comparison.interestSaved}
                                originalCurrency="USD"
                              />
                            </span>
                          </li>
                          <li className="flex justify-between border-t pt-1 mt-1">
                            <span>{t('loanComparison.timeReduction')}</span>
                            <span className="font-medium">
                              {formatTimeSpan(
                                comparison.baselinePayoff.payoffTimeMonths -
                                  comparison.acceleratedPayoff.payoffTimeMonths,
                                locale
                              )}
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Direct comparison of investment vs. paydown over same period */}
                    <div
                      className={`p-4 rounded-lg ${
                        payingDownBetter
                          ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
                          : 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <h4 className="font-medium mb-3 flex items-center">
                        {payingDownBetter ? (
                          <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                        ) : (
                          <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                        )}
                        {t('loanComparison.financialComparison')}
                      </h4>

                      <div className="text-lg font-bold mb-2">
                        {payingDownBetter
                          ? t('loanComparison.payDownThisLoanMessage', {
                              amount: (
                                <CurrencyFormatter
                                  value={comparison.netAdvantage}
                                  originalCurrency="USD"
                                />
                              ),
                            })
                          : t('loanComparison.minimumPaymentsMessage', {
                              amount: (
                                <CurrencyFormatter
                                  value={comparison.netAdvantage}
                                  originalCurrency="USD"
                                />
                              ),
                            })}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                          <h6 className="font-medium mb-2">
                            {t('loanComparison.strategy1Title')}
                          </h6>
                          <ul className="space-y-2 text-sm">
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.totalInterestPaid')}
                              </span>
                              <span className="font-medium text-red-600">
                                <CurrencyFormatter
                                  value={
                                    comparison.baselinePayoff.totalInterestPaid
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.investmentGrowth')}
                              </span>
                              <span className="font-medium text-green-600">
                                <CurrencyFormatter
                                  value={comparison.potentialInvestmentGrowth}
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.riskAdjustedGrowth')}
                              </span>
                              <span className="font-medium text-blue-600">
                                <CurrencyFormatter
                                  value={
                                    comparison.riskAdjustedGrowth ||
                                    comparison.potentialInvestmentGrowth *
                                      riskFactor
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between border-t pt-1 mt-1">
                              <span className="font-medium">
                                {t('loanComparison.netCost')}
                              </span>
                              <span className="font-bold">
                                <CurrencyFormatter
                                  value={
                                    comparison.baselinePayoff
                                      .totalInterestPaid -
                                    (comparison.riskAdjustedGrowth ||
                                      comparison.potentialInvestmentGrowth *
                                        riskFactor)
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                          </ul>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                          <h6 className="font-medium mb-2">
                            {t('loanComparison.strategy2Title')}
                          </h6>
                          <ul className="space-y-2 text-sm">
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.totalInterestPaid')}
                              </span>
                              <span className="font-medium text-red-600">
                                <CurrencyFormatter
                                  value={
                                    comparison.acceleratedPayoff
                                      .totalInterestPaid
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between">
                              <span>{t('loanComparison.interestSaved')}</span>
                              <span className="font-medium text-green-600">
                                <CurrencyFormatter
                                  value={comparison.interestSaved}
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between">
                              <span>{t('loanComparison.opportunityCost')}</span>
                              <span className="font-medium text-amber-600">
                                <CurrencyFormatter
                                  value={
                                    comparison.riskAdjustedGrowth ||
                                    comparison.potentialInvestmentGrowth *
                                      riskFactor
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between border-t pt-1 mt-1">
                              <span className="font-medium">
                                {t('loanComparison.netCost')}
                              </span>
                              <span className="font-bold">
                                <CurrencyFormatter
                                  value={
                                    comparison.acceleratedPayoff
                                      .totalInterestPaid
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <p className="text-sm mt-4">
                        <span className="font-medium">
                          {t('loanComparison.keyInsight')}:
                        </span>{' '}
                        {recommendationType === 'definitely-pay'
                          ? t('loanComparison.highInterestLoanInsight', {
                              loanRate: comparison.interestRate.toFixed(2),
                              spReturn: spReturn.toFixed(2),
                            })
                          : recommendationType === 'probably-pay'
                            ? t('loanComparison.mediumInterestLoanInsight', {
                                loanRate: comparison.interestRate.toFixed(2),
                                spReturn: spReturn.toFixed(2),
                                riskAdjustedReturn:
                                  riskAdjustedReturn.toFixed(2),
                              })
                            : t('loanComparison.lowInterestLoanInsight', {
                                loanRate: comparison.interestRate.toFixed(2),
                                riskAdjustedReturn:
                                  riskAdjustedReturn.toFixed(2),
                              })}
                      </p>
                    </div>
                  </TabsContent>

                  {/* Full-term comparison */}
                  <TabsContent value="full-term" className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center">
                        <Info className="h-5 w-5 mr-2 text-blue-600" />
                        {t('loanComparison.fullTermComparison')}
                      </h4>

                      <p className="text-sm mb-4">
                        {t('loanComparison.fullTermDescription', {
                          years: Math.ceil(
                            comparison.baselinePayoff.payoffTimeYears
                          ),
                        })}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-sm mb-2">
                            {t('loanComparison.investImmediately')}
                          </h5>
                          <ul className="space-y-2 text-xs">
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.regularPayoffTime')}
                              </span>
                              <span>
                                {formatTimeSpan(
                                  comparison.baselinePayoff.payoffTimeMonths,
                                  locale
                                )}
                              </span>
                            </li>
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.fullTermInvestmentGrowth')}
                              </span>
                              <span className="text-green-600">
                                <CurrencyFormatter
                                  value={
                                    comparison.longTermInvestmentGrowth || 0
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.totalInterestPaid')}
                              </span>
                              <span className="text-red-600">
                                <CurrencyFormatter
                                  value={
                                    comparison.baselinePayoff.totalInterestPaid
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between border-t pt-1 mt-1">
                              <span className="font-medium">
                                {t('strategyResults.finalNetWorth')}
                              </span>
                              <span className="font-medium">
                                <CurrencyFormatter
                                  value={
                                    comparison.fullTermComparison
                                      ?.investingOnlyNetWorth || 0
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                          </ul>
                        </div>

                        <div>
                          <h5 className="font-medium text-sm mb-2">
                            {t('loanComparison.payThenInvest')}
                          </h5>
                          <ul className="space-y-2 text-xs">
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.payoffTimeAccelerated')}
                              </span>
                              <span>
                                {formatTimeSpan(
                                  comparison.acceleratedPayoff.payoffTimeMonths,
                                  locale
                                )}
                              </span>
                            </li>
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.acceleratedStrategyTotal')}
                              </span>
                              <span className="text-green-600">
                                <CurrencyFormatter
                                  value={
                                    comparison.acceleratedStrategyTotalValue ||
                                    0
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between">
                              <span>
                                {t('loanComparison.totalInterestPaid')}
                              </span>
                              <span className="text-red-600">
                                <CurrencyFormatter
                                  value={
                                    comparison.acceleratedPayoff
                                      .totalInterestPaid
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                            <li className="flex justify-between border-t pt-1 mt-1">
                              <span className="font-medium">
                                {t('strategyResults.finalNetWorth')}
                              </span>
                              <span className="font-medium">
                                <CurrencyFormatter
                                  value={
                                    comparison.fullTermComparison
                                      ?.acceleratedStrategyNetWorth || 0
                                  }
                                  originalCurrency="USD"
                                />
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Best long-term strategy indicator */}
                      <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                        <h5 className="font-medium text-sm mb-1">
                          {t('loanComparison.bestLongTermStrategy')}
                        </h5>
                        <div className="flex items-center">
                          {comparison.fullTermComparison?.isBetter ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              <span className="font-medium">
                                {t('loanComparison.payThenInvest')}
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-4 w-4 text-blue-600 mr-2" />
                              <span className="font-medium">
                                {t('loanComparison.investImmediately')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Strategy explanation */}
                <div
                  className={`p-4 rounded-lg ${
                    recommendationType === 'definitely-pay'
                      ? 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300'
                      : recommendationType === 'probably-pay'
                        ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300'
                        : 'bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  <div className="flex items-start mb-4">
                    {strategyInfo.icon}
                    <div>
                      <h5 className="font-bold text-lg">
                        {strategyInfo.title}
                      </h5>
                      <p className="font-medium">{strategyInfo.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-8 text-sm">
        <h4 className="font-medium mb-2">
          {t('loanComparison.howWeCalculate')}
        </h4>
        <p className="mb-3">{t('loanComparison.compareImpact')}</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>
            <strong>{t('loanComparison.strategy1')}: </strong>
            {t('loanComparison.strategy1Description', { returnRate: spReturn })}
          </li>
          <li>
            <strong>{t('loanComparison.strategy2')}: </strong>
            {t('loanComparison.strategy2Description')}
          </li>
          <li>
            <strong>{t('loanComparison.riskAdjustedStrategy')}: </strong>
            {t('loanComparison.riskAdjustedStrategyDescription', {
              marketReturn: spReturn,
              riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
              riskFactor: (riskFactor * 100).toFixed(0),
            })}
          </li>
        </ol>

        <div className="mt-6 p-3 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/10">
          <h5 className="font-medium mb-2">
            {t('loanComparison.ourRecommendation')}
          </h5>
          <p>{t('loanComparison.tieredStrategyExplanation')}</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              {t('loanComparison.tier1', {
                threshold: (spReturn + 1).toFixed(1),
              })}
            </li>
            <li>
              {t('loanComparison.tier2', {
                lower: riskAdjustedReturn.toFixed(1),
                upper: (spReturn + 1).toFixed(1),
              })}
            </li>
            <li>
              {t('loanComparison.tier3', {
                lower: 2.5,
                upper: riskAdjustedReturn.toFixed(1),
              })}
            </li>
            <li>{t('loanComparison.tier4', { threshold: 2.5 })}</li>
          </ul>
        </div>

        <p className="mt-4">
          <span className="font-semibold">
            {t('loanComparison.balanceRiskReturn')}
          </span>
          : {t('loanComparison.balanceExplanation')}
        </p>
      </div>
    </div>
  )
}

export default LoanComparison
