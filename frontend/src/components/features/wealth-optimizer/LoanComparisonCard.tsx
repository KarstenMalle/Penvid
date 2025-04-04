import React, { useState } from 'react'
import { useLocalization } from '@/context/LocalizationContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import {
  CircleCheck,
  CircleX,
  DollarSign,
  TrendingUp,
  Info,
} from 'lucide-react'

interface LoanComparisonCardProps {
  comparison: any
  riskFactor: number
  annualReturn: number
  shouldPayDown: boolean
  riskCategory?: 'high' | 'medium' | 'low'
}

export default function LoanComparisonCard({
  comparison,
  riskFactor,
  annualReturn,
  shouldPayDown,
  riskCategory = 'medium',
}: LoanComparisonCardProps) {
  const { t, formatCurrency } = useLocalization()
  const [activeTab, setActiveTab] = useState('short-term')

  // Extract data from comparison (fallback to default values if properties missing)
  const {
    loanId = 0,
    loanName = 'Loan',
    interestRate = 0,
    originalBalance = 0,
    minimumPayment = 0,
    baselinePayoff = {},
    acceleratedPayoff = {},
    extraMonthlyPayment = 0,
    interestSaved = 0,
    potentialInvestmentGrowth = 0,
    netAdvantage = 0,
    betterStrategy = 'pay-down',
  } = comparison || {}

  // Calculate risk-adjusted investment growth
  const riskAdjustedGrowth = potentialInvestmentGrowth * riskFactor

  // Get styling based on risk category
  const getCardStyling = () => {
    switch (riskCategory) {
      case 'high':
        return {
          headerBg: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-300',
          textColor: 'text-red-800 dark:text-red-300',
        }
      case 'medium':
        return {
          headerBg: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-300',
          textColor: 'text-amber-800 dark:text-amber-300',
        }
      case 'low':
        return {
          headerBg: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-300',
          textColor: 'text-green-800 dark:text-green-300',
        }
      default:
        return {
          headerBg: 'bg-gray-50 dark:bg-gray-800/50',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-800 dark:text-gray-300',
        }
    }
  }

  const styles = getCardStyling()

  return (
    <Card className={`border ${styles.borderColor}`}>
      <CardHeader className={`${styles.headerBg} rounded-t-lg`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{loanName}</CardTitle>
            <CardDescription>
              <span className="font-medium">{interestRate}%</span> interest •{' '}
              <CurrencyFormatter value={originalBalance} /> balance •{' '}
              <CurrencyFormatter value={minimumPayment} />
              /month minimum
            </CardDescription>
          </div>
          <div className="flex items-center">
            {shouldPayDown ? (
              <div className="flex items-center bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-3 py-1 rounded-full text-sm">
                <CircleCheck className="h-4 w-4 mr-1" />
                {t('loanComparison.payDownFirst')}
              </div>
            ) : (
              <div className="flex items-center bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full text-sm">
                <CircleCheck className="h-4 w-4 mr-1" />
                {t('loanComparison.investInstead')}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs
          defaultValue={activeTab}
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="short-term">Short-term Comparison</TabsTrigger>
            <TabsTrigger value="full-term">Full-term Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="short-term">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">
                  {t('loanComparison.ifYouPayMinimums')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.monthlyPayment')}</span>
                    <span className="font-medium">
                      <CurrencyFormatter value={minimumPayment} />
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.timeToPayoff')}</span>
                    <span className="font-medium">
                      {baselinePayoff.payoffTimeMonths
                        ? `${Math.floor(baselinePayoff.payoffTimeMonths / 12)} years ${baselinePayoff.payoffTimeMonths % 12} months`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.extraMoneyCouldEarn')}</span>
                    <span className="font-medium text-green-600">
                      <CurrencyFormatter value={potentialInvestmentGrowth} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">
                  {t('loanComparison.ifYouPayDownAggressively')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.monthlyPayment')}</span>
                    <span className="font-medium">
                      <CurrencyFormatter
                        value={minimumPayment + extraMonthlyPayment}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.timeToPayoff')}</span>
                    <span className="font-medium">
                      {acceleratedPayoff.payoffTimeMonths
                        ? `${Math.floor(acceleratedPayoff.payoffTimeMonths / 12)} years ${acceleratedPayoff.payoffTimeMonths % 12} months`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.interestSaved')}</span>
                    <span className="font-medium text-green-600">
                      <CurrencyFormatter value={interestSaved} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="font-medium mb-2">
                {t('loanComparison.financialComparison')}
              </h3>
              <div className="flex justify-between items-center">
                <div>
                  {shouldPayDown ? (
                    <p className="text-sm">
                      {t('loanComparison.payDownThisLoanMessage', {
                        amount: formatCurrency(netAdvantage),
                      })}
                    </p>
                  ) : (
                    <p className="text-sm">
                      {t('loanComparison.minimumPaymentsMessage', {
                        amount: formatCurrency(netAdvantage),
                      })}
                    </p>
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    <CurrencyFormatter value={netAdvantage} />
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    difference
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="full-term">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg mb-4">
              <p className="text-sm">
                {t('loanComparison.fullTermDescription', {
                  years: Math.ceil(baselinePayoff.payoffTimeMonths / 12) || 10,
                })}
              </p>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.regularPayoffTime')}</span>
                    <span className="font-medium">
                      {baselinePayoff.payoffTimeMonths
                        ? `${Math.floor(baselinePayoff.payoffTimeMonths / 12)} years ${baselinePayoff.payoffTimeMonths % 12} months`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.fullTermInvestmentGrowth')}</span>
                    <span className="font-medium text-green-600">
                      <CurrencyFormatter
                        value={potentialInvestmentGrowth * 1.5}
                      />{' '}
                      {/* Used as placeholder */}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.acceleratedStrategyTotal')}</span>
                    <span className="font-medium">
                      <CurrencyFormatter
                        value={interestSaved + potentialInvestmentGrowth * 0.5}
                      />{' '}
                      {/* Used as placeholder */}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('loanComparison.bestLongTermStrategy')}</span>
                    <span className="font-medium">
                      {shouldPayDown
                        ? t('loanComparison.payThenInvest')
                        : t('loanComparison.investImmediately')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <div className="flex items-center text-sm">
          <Info className="h-4 w-4 mr-1" />
          <span className={`${styles.textColor}`}>
            {interestRate > annualReturn
              ? t('loanComparison.highInterestLoanInsight', {
                  loanRate: interestRate.toFixed(1),
                  spReturn: annualReturn.toFixed(1),
                  riskAdjustedReturn: (annualReturn * riskFactor).toFixed(1),
                })
              : t('loanComparison.lowInterestLoanInsight', {
                  loanRate: interestRate.toFixed(1),
                  spReturn: annualReturn.toFixed(1),
                  riskAdjustedReturn: (annualReturn * riskFactor).toFixed(1),
                })}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
