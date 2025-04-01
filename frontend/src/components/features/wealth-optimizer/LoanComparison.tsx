import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LoanStrategyComparison } from './types'
import { formatPercent, formatTimeSpan } from './calculations'
import { useLocalization } from '@/context/LocalizationContext'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react'

interface LoanComparisonProps {
  comparisons: LoanStrategyComparison[]
  spReturn: number
  riskFactor?: number // Risk factor for investment (0-1, default 0.7)
}

/**
 * Component to display detailed loan-by-loan comparison to make the decision clearer
 * Now with risk-adjusted analysis and more nuanced recommendations
 */
const LoanComparison: React.FC<LoanComparisonProps> = ({
  comparisons,
  spReturn,
  riskFactor = 0.7, // Default risk factor - 70% confidence in market returns
}) => {
  const { t, locale, formatCurrency, currency } = useLocalization()

  // Calculate risk-adjusted return
  const riskAdjustedReturn = spReturn * riskFactor

  // If no comparisons, show empty state
  if (!comparisons.length) {
    return null
  }

  // Determine loan payment strategy considering risk
  const getLoanPaymentStrategy = (loanRate: number) => {
    // High interest loans - definitely pay off first (above SP return)
    if (loanRate > spReturn + 1) {
      return {
        recommendation: 'definitely-pay',
        icon: <CheckCircle className="h-5 w-5 text-green-600 mr-2" />,
        title: t('loanComparison.definitelyPayDown'),
        description: t('loanComparison.definitelyPayDownDesc', {
          loanRate,
          spReturn,
        }),
      }
    }
    // Medium-high interest loans - consider risk (between risk-adjusted and full return)
    else if (loanRate > riskAdjustedReturn) {
      return {
        recommendation: 'probably-pay',
        icon: <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />,
        title: t('loanComparison.probablyPayDown'),
        description: t('loanComparison.probablyPayDownDesc', {
          loanRate,
          spReturn,
          riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
        }),
      }
    }
    // Low interest loans - invest instead (below risk-adjusted return)
    else {
      return {
        recommendation: 'invest-instead',
        icon: <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />,
        title: t('loanComparison.investInstead'),
        description: t('loanComparison.investInsteadDesc', {
          loanRate,
          riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
        }),
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">
          {t('loanComparison.loanByLoanStrategy')}
        </h3>
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
            <h4 className="font-medium">
              {t('loanComparison.riskAdjustedAnalysis')}
            </h4>
          </div>
          <p className="text-sm">
            {t('loanComparison.riskAdjustedExplanation', {
              spReturn,
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

      {comparisons.map((comparison) => {
        const strategy = getLoanPaymentStrategy(comparison.interestRate)
        const payingDownIsBetter = comparison.interestRate > riskAdjustedReturn

        return (
          <Card
            key={comparison.loanId}
            className={/* styling remains the same */}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle>{comparison.loanName}</CardTitle>
                {/* Strategy recommendation badge remains the same */}
              </div>
              <CardDescription>
                {comparison.interestRate}% {t('loans.interestRate')} •
                {/* KEY FIX: No originalCurrency - let CurrencyFormatter handle the conversion */}
                <CurrencyFormatter value={comparison.originalBalance} />{' '}
                {t('loans.balance')} •
                <CurrencyFormatter
                  value={comparison.minimumPayment}
                  minimumFractionDigits={2}
                  maximumFractionDigits={2}
                />
                /{t('loanComparison.month')} {t('loanComparison.minimum')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
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
                            value={comparison.baselinePayoff.totalInterestPaid}
                          />
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>{t('loanComparison.extraMoneyCouldEarn')}</span>
                        <span className="font-medium text-green-600">
                          <CurrencyFormatter
                            value={comparison.potentialInvestmentGrowth}
                          />
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>{t('loanComparison.riskAdjustedEarnings')}</span>
                        <span className="font-medium text-blue-600">
                          <CurrencyFormatter
                            value={
                              comparison.potentialInvestmentGrowth * riskFactor
                            }
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
                      <li className="flex justify-between">
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

                <div
                  className={`p-4 rounded-lg ${
                    strategy.recommendation === 'definitely-pay'
                      ? 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300'
                      : strategy.recommendation === 'probably-pay'
                        ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300'
                        : 'bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  <div className="flex items-start mb-4">
                    {strategy.icon}
                    <div>
                      <h5 className="font-bold text-lg">{strategy.title}</h5>
                      <p className="font-medium">{strategy.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                      <h6 className="font-medium mb-2">
                        {t('loanComparison.strategy1Title')}
                      </h6>
                      <ul className="space-y-2 text-sm">
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
                          <span>{t('loanComparison.investmentGrowth')}</span>
                          <span className="font-medium text-green-600">
                            <CurrencyFormatter
                              value={comparison.potentialInvestmentGrowth}
                              originalCurrency="USD"
                            />
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>{t('loanComparison.riskAdjustedGrowth')}</span>
                          <span className="font-medium text-blue-600">
                            <CurrencyFormatter
                              value={
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
                                comparison.baselinePayoff.totalInterestPaid -
                                comparison.potentialInvestmentGrowth *
                                  riskFactor
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
                        <li className="flex justify-between">
                          <span>{t('loanComparison.opportunityCost')}</span>
                          <span className="font-medium text-amber-600">
                            <CurrencyFormatter
                              value={
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
                                comparison.acceleratedPayoff.totalInterestPaid
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
                    {strategy.recommendation === 'definitely-pay'
                      ? t('loanComparison.highInterestLoanInsight', {
                          loanRate: comparison.interestRate,
                          spReturn: spReturn,
                        })
                      : strategy.recommendation === 'probably-pay'
                        ? t('loanComparison.mediumInterestLoanInsight', {
                            loanRate: comparison.interestRate,
                            spReturn: spReturn,
                            riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
                          })
                        : t('loanComparison.lowInterestLoanInsight', {
                            loanRate: comparison.interestRate,
                            riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
                          })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-4 text-sm">
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

        <div className="mt-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
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
