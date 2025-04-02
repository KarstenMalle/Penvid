// frontend/src/components/features/wealth-optimizer/WealthOptimizer.tsx

'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import StrategyResultsComponent from './StrategyResults'
import { Loan, LoanType } from './types'
import { Icons } from '@/components/ui/icons'
import { useAuth } from '@/context/AuthContext'
import { LoanService } from '@/services/LoanService'
import {
  FinancialApiService,
  FinancialStrategyResponse,
} from '@/services/FinancialApiService'
import toast from 'react-hot-toast'
import {
  HelpCircle,
  AlertTriangle,
  Shield,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useLocalization } from '@/context/LocalizationContext'
import Link from 'next/link'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'

// Component that displays a list of loans with checkboxes for selection
const LoanSelectList = ({
  loans,
  selectedLoanIds,
  onToggleLoan,
}: {
  loans: Loan[]
  selectedLoanIds: number[]
  onToggleLoan: (id: number) => void
}) => {
  const { t } = useLocalization()

  if (loans.length === 0) {
    return (
      <div className="p-4 text-center border rounded-md bg-gray-50 dark:bg-gray-800">
        <p>{t('loans.noLoansFound')}</p>
        <Link
          href="/loans"
          className="text-blue-600 hover:underline inline-block mt-2"
        >
          <Button variant="link" className="p-0">
            {t('loans.addLoanToGetStarted')}
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {loans.map((loan) => (
        <div
          key={loan.id}
          className={`flex items-center p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            selectedLoanIds.includes(loan.id)
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <input
            type="checkbox"
            id={`loan-${loan.id}`}
            checked={selectedLoanIds.includes(loan.id)}
            onChange={() => onToggleLoan(loan.id)}
            className="h-4 w-4 mr-3 rounded text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor={`loan-${loan.id}`}
            className="flex flex-1 justify-between cursor-pointer"
          >
            <div>
              <div className="font-medium">{loan.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {loan.loanType &&
                  t(`loans.types.${loan.loanType.toLowerCase()}`)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                <CurrencyFormatter value={loan.balance} />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {loan.interestRate}%
              </div>
            </div>
          </label>
        </div>
      ))}
    </div>
  )
}

const WealthOptimizer: React.FC = () => {
  // Auth context for user information
  const { user, isAuthenticated, loading } = useAuth()

  // User inputs
  const [monthlyAvailable, setMonthlyAvailable] = useState(1000)
  const [isOverallBudget, setIsOverallBudget] = useState(false)
  const [allLoans, setAllLoans] = useState<Loan[]>([])
  const [selectedLoanIds, setSelectedLoanIds] = useState<number[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Risk adjustment factor (0.3-1.0, where 0.7 is default)
  const [riskFactor, setRiskFactor] = useState<number>(0.7) // 70% confidence in market returns

  const { t, currency } = useLocalization()

  // Results
  const [strategyResults, setStrategyResults] =
    useState<FinancialStrategyResponse | null>(null)

  // Load all loans from the database
  useEffect(() => {
    const loadUserLoans = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Fetch user's loans
        const userLoans = await LoanService.getUserLoans(user.id, currency)

        if (userLoans.length > 0) {
          setAllLoans(userLoans)
          // Select all loans by default
          setSelectedLoanIds(userLoans.map((loan) => loan.id))
        }
      } catch (error) {
        console.error('Error loading loans:', error)
        toast.error(t('loans.failedToLoadLoanData'))
        setAllLoans([])
      } finally {
        setIsLoading(false)
      }
    }

    loadUserLoans()
  }, [user, isAuthenticated, currency, t])

  // Toggle a loan selection
  const toggleLoanSelection = (loanId: number) => {
    setSelectedLoanIds((prev) =>
      prev.includes(loanId)
        ? prev.filter((id) => id !== loanId)
        : [...prev, loanId]
    )
  }

  // Get selected loans
  const getSelectedLoans = () => {
    return allLoans.filter((loan) => selectedLoanIds.includes(loan.id))
  }

  // Calculate total minimum monthly payment for all selected loans
  const calculateTotalMinimumPayment = () => {
    return getSelectedLoans().reduce(
      (total, loan) => total + loan.minimumPayment,
      0
    )
  }

  // Calculate remaining money after paying minimums
  const calculateRemainingMoney = () => {
    const totalMinimumPayment = calculateTotalMinimumPayment()
    return isOverallBudget
      ? Math.max(0, monthlyAvailable - totalMinimumPayment)
      : monthlyAvailable
  }

  // Handle monthly available input change
  const handleMonthlyAvailableChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    if (value === '') {
      setMonthlyAvailable(0)
    } else {
      const numValue = parseFloat(value)
      setMonthlyAvailable(isNaN(numValue) ? 0 : numValue)
    }
  }

  // Calculate the optimal financial strategy using our backend API
  const calculateResults = async () => {
    const selectedLoans = getSelectedLoans()

    if (selectedLoans.length === 0) {
      toast.error(t('wealthOptimizer.selectAtLeastOneLoan'))
      return
    }

    setIsCalculating(true)

    try {
      // Calculate based on overall budget setting
      const actualAvailable = isOverallBudget
        ? monthlyAvailable // User's input already in their currency
        : monthlyAvailable + calculateTotalMinimumPayment()

      // Call the backend API to get the optimal strategy
      const results = await FinancialApiService.getFinancialStrategy(
        user!.id,
        selectedLoans,
        actualAvailable,
        0.07, // Default annual investment return
        0.025, // Default inflation rate
        riskFactor,
        currency
      )

      // Update state with results
      setStrategyResults(results)

      toast.success(t('wealthOptimizer.calculationComplete'))
    } catch (error) {
      console.error('Error calculating results:', error)
      toast.error(t('wealthOptimizer.errorCalculatingResults'))
    } finally {
      setIsCalculating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{t('loans.loadingLoanData')}</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('wealthOptimizer.title')}</CardTitle>
          <CardDescription>{t('wealthOptimizer.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loan Selection */}
          <div className="space-y-2">
            <Label>{t('wealthOptimizer.selectLoans')}</Label>
            <LoanSelectList
              loans={allLoans}
              selectedLoanIds={selectedLoanIds}
              onToggleLoan={toggleLoanSelection}
            />

            {allLoans.length > 0 && (
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span>
                  {selectedLoanIds.length} {t('wealthOptimizer.of')}{' '}
                  {allLoans.length} {t('wealthOptimizer.loansSelected')}
                </span>
                <div>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() =>
                      setSelectedLoanIds(allLoans.map((loan) => loan.id))
                    }
                  >
                    {t('wealthOptimizer.selectAll')}
                  </Button>
                  {' | '}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => setSelectedLoanIds([])}
                  >
                    {t('wealthOptimizer.clearAll')}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Link href="/loans">
                <Button variant="outline" size="sm">
                  {t('wealthOptimizer.manageLoans')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Monthly Available Money */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="monthlyAvailable">
                {isOverallBudget
                  ? t('wealthOptimizer.totalMonthlyBudget')
                  : t('wealthOptimizer.monthlyMoneyAvailable')}
              </Label>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOverallBudget(!isOverallBudget)}
                >
                  {t('wealthOptimizer.switchTo')}{' '}
                  {isOverallBudget
                    ? t('wealthOptimizer.extraMoneyOnly')
                    : t('wealthOptimizer.totalBudget')}
                </Button>
                <div className="relative ml-2 group">
                  <HelpCircle className="h-5 w-5 text-gray-400" />
                  <div className="absolute right-0 w-64 p-2 bg-gray-100 dark:bg-gray-800 rounded shadow-lg invisible group-hover:visible z-10 text-xs">
                    {isOverallBudget
                      ? t('wealthOptimizer.totalBudgetHelp')
                      : t('wealthOptimizer.extraMoneyHelp')}
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                {currency === 'USD'
                  ? '$'
                  : currency === 'DKK'
                    ? 'kr'
                    : currency}
              </span>
              <Input
                id="monthlyAvailable"
                type="number"
                min="0"
                className="pl-7"
                value={monthlyAvailable || ''}
                onChange={handleMonthlyAvailableChange}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isOverallBudget
                ? t('wealthOptimizer.totalBudgetDescription', {
                    minimumPayment: (
                      <CurrencyFormatter
                        value={calculateTotalMinimumPayment()}
                      />
                    ),
                  })
                : t('wealthOptimizer.extraMoneyDescription')}
            </p>
            {isOverallBudget && (
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {t('wealthOptimizer.extraAvailableAfterMinimumPayments')}{' '}
                <CurrencyFormatter value={calculateRemainingMoney()} />
                {t('wealthOptimizer.perMonth')}
              </div>
            )}
          </div>

          {/* Risk Adjustment Slider */}
          <div className="space-y-2 pt-2 border-t dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Label htmlFor="riskFactor" className="flex items-center">
                <Shield className="h-4 w-4 mr-1 text-blue-600" />
                {t('wealthOptimizer.riskAdjustmentFactor')}
              </Label>
              <span className="font-medium text-sm">
                {Math.round(riskFactor * 100)}%
              </span>
            </div>

            <div className="px-2">
              <input
                id="riskFactor"
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={riskFactor}
                onChange={(e) => setRiskFactor(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
              <span>{t('wealthOptimizer.lowerRiskConservative')}</span>
              <span>{t('wealthOptimizer.higherRiskAggressive')}</span>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-sm mt-2">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">
                    {t('wealthOptimizer.riskAdjustmentTitle')}
                  </p>
                  <p>
                    {t('wealthOptimizer.riskAdjustmentDescription', {
                      factor: Math.round(riskFactor * 100),
                      expectedReturn: 6.8,
                      adjustedReturn: (6.8 * riskFactor).toFixed(1),
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Button */}
          <div className="pt-4">
            <Button
              onClick={calculateResults}
              className="w-full"
              disabled={
                isCalculating ||
                selectedLoanIds.length === 0 ||
                monthlyAvailable <= 0
              }
            >
              {isCalculating ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  {t('wealthOptimizer.calculating')}
                </>
              ) : (
                t('wealthOptimizer.analyzeMyOptions')
              )}
            </Button>
          </div>

          {/* Information about budget calculation */}
          <div className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
            {isOverallBudget ? (
              <p>
                {t('wealthOptimizer.totalBudgetInfo', {
                  totalBudget: <CurrencyFormatter value={monthlyAvailable} />,
                })}
              </p>
            ) : (
              <p>
                {t('wealthOptimizer.extraBudgetInfo', {
                  extraMoney: <CurrencyFormatter value={monthlyAvailable} />,
                  minimumPayments: (
                    <CurrencyFormatter value={calculateTotalMinimumPayment()} />
                  ),
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fair Comparison Explanation */}
      <Accordion
        type="single"
        collapsible
        className="border rounded-lg bg-white dark:bg-gray-900"
      >
        <AccordionItem value="fair-comparison">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              <span className="font-medium">
                {t('wealthOptimizer.fairComparisonTitle')}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3 text-sm">
              <p>{t('wealthOptimizer.fairComparisonExplanation')}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-medium flex items-center mb-2">
                    <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                    {t('wealthOptimizer.commonMistakeTitle')}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('wealthOptimizer.commonMistakeDescription')}
                  </p>
                </div>

                <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-medium flex items-center mb-2">
                    <Shield className="h-4 w-4 mr-2 text-green-600" />
                    {t('wealthOptimizer.ourApproachTitle')}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('wealthOptimizer.ourApproachDescription')}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg mt-2">
                <p className="font-medium">
                  {t('wealthOptimizer.fairComparisonConclusion')}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Results Section */}
      {strategyResults && !isCalculating && (
        <Card>
          <CardHeader>
            <CardTitle>{t('wealthOptimizer.personalizedWealthPlan')}</CardTitle>
            <CardDescription>
              {t('wealthOptimizer.basedOnInputs', {
                years: 30,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Recommendation Card */}
              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardHeader>
                  <CardTitle className="text-blue-700 dark:text-blue-400">
                    {t('wealthOptimizer.recommendedStrategy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-bold">
                        {t(
                          `strategyNames.${strategyResults.recommendation.best_strategy}`
                        )}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {strategyResults.recommendation.reason}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium">
                        {t('strategyResults.projected30YearOutcome')}
                      </p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        <CurrencyFormatter
                          value={
                            strategyResults.recommendation
                              .investment_value_after_loan_payoff +
                            strategyResults.recommendation.interest_savings
                          }
                        />
                      </p>
                    </div>

                    <div>
                      <p className="font-medium">
                        {t('strategyResults.whyThisIsBetter')}
                      </p>
                      <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium">
                              {t('strategyResults.keyMetrics')}
                            </h5>
                            <ul className="mt-2 space-y-2">
                              <li className="flex justify-between">
                                <span>
                                  {t('strategyResults.interestSaved')}
                                </span>
                                <span className="font-medium text-green-600">
                                  <CurrencyFormatter
                                    value={
                                      strategyResults.recommendation
                                        .interest_savings
                                    }
                                  />
                                </span>
                              </li>
                              <li className="flex justify-between">
                                <span>
                                  {t('strategyResults.timeShortened')}
                                </span>
                                <span className="font-medium">
                                  {strategyResults.recommendation.months_saved}{' '}
                                  {t('strategyResults.months')}
                                </span>
                              </li>
                              <li className="flex justify-between">
                                <span>
                                  {t('strategyResults.advantageAmount')}
                                </span>
                                <span className="font-medium text-blue-600">
                                  <CurrencyFormatter
                                    value={
                                      strategyResults.recommendation
                                        .total_savings_advantage
                                    }
                                  />
                                </span>
                              </li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium">
                              {t('strategyResults.comparisonSummary')}
                            </h5>
                            <div className="mt-2 space-y-2">
                              <p className="text-sm">
                                {strategyResults.recommendation
                                  .best_strategy === 'Extra Payments First'
                                  ? t(
                                      'strategyResults.extraPaymentsExplanation'
                                    )
                                  : t('strategyResults.investFirstExplanation')}
                              </p>
                              <p className="text-sm font-medium mt-2">
                                {t('strategyResults.loanDetails', {
                                  name: strategyResults.loan_details.name,
                                  rate: (
                                    strategyResults.loan_details.interest_rate *
                                    100
                                  ).toFixed(2),
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t('strategyResults.amortizationComparison')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-60">
                        {/* Here we would add a chart component */}
                        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p>{t('strategyResults.chartPlaceholder')}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                          <p className="text-sm font-medium">
                            {t('strategyResults.withMinimumPayments')}
                          </p>
                          <p className="text-lg font-bold">
                            {
                              strategyResults.amortization_comparison.baseline
                                .months_to_payoff
                            }{' '}
                            {t('strategyResults.months')}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('strategyResults.totalInterest')}:{' '}
                            <CurrencyFormatter
                              value={
                                strategyResults.amortization_comparison.baseline
                                  .total_interest
                              }
                            />
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                          <p className="text-sm font-medium">
                            {t('strategyResults.withExtraPayments')}
                          </p>
                          <p className="text-lg font-bold">
                            {
                              strategyResults.amortization_comparison
                                .with_extra_payments.months_to_payoff
                            }{' '}
                            {t('strategyResults.months')}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('strategyResults.totalInterest')}:{' '}
                            <CurrencyFormatter
                              value={
                                strategyResults.amortization_comparison
                                  .with_extra_payments.total_interest
                              }
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t('strategyResults.investmentComparison')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-60">
                        {/* Here we would add a chart component */}
                        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p>{t('strategyResults.chartPlaceholder')}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                          <p className="text-sm font-medium">
                            {t('strategyResults.investImmediately')}
                          </p>
                          <p className="text-lg font-bold">
                            <CurrencyFormatter
                              value={
                                strategyResults.investment_comparison
                                  .immediate_investment.risk_adjusted_balance
                              }
                            />
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('strategyResults.withoutRiskAdjustment')}:{' '}
                            <CurrencyFormatter
                              value={
                                strategyResults.investment_comparison
                                  .immediate_investment.final_balance
                              }
                            />
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                          <p className="text-sm font-medium">
                            {t('strategyResults.investAfterPayoff')}
                          </p>
                          <p className="text-lg font-bold">
                            <CurrencyFormatter
                              value={
                                strategyResults.investment_comparison
                                  .investment_after_payoff.risk_adjusted_balance
                              }
                            />
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('strategyResults.withoutRiskAdjustment')}:{' '}
                            <CurrencyFormatter
                              value={
                                strategyResults.investment_comparison
                                  .investment_after_payoff.final_balance
                              }
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t('strategyResults.additionalRecommendations')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                      <h4 className="font-medium">
                        {t('strategyResults.emergencyFundFirst')}
                      </h4>
                      <p className="mt-1 text-sm">
                        {t('strategyResults.emergencyFundDescription')}
                      </p>
                    </div>

                    {strategyResults.loan_details.interest_rate > 0.08 && (
                      <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                        <h4 className="font-medium">
                          {t('strategyResults.considerRefinancing')}
                        </h4>
                        <p className="mt-1 text-sm">
                          {t('strategyResults.refinancingDescription', {
                            rate: (
                              strategyResults.loan_details.interest_rate * 100
                            ).toFixed(2),
                          })}
                        </p>
                      </div>
                    )}

                    <div className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 rounded-lg">
                      <h4 className="font-medium">
                        {t('strategyResults.consistentPayments')}
                      </h4>
                      <p className="mt-1 text-sm">
                        {t('strategyResults.consistentPaymentsDescription')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Important Notes */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm space-y-2">
                <h3 className="font-medium">
                  {t('strategyResults.importantNotes')}
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('strategyResults.projectionNote', { rate: 6.8 })}</li>
                  <li>{t('strategyResults.marketReturnsNote')}</li>
                  <li>{t('strategyResults.consistentContributionsNote')}</li>
                  <li>{t('strategyResults.customizedApproachNote')}</li>
                  <li>{t('strategyResults.riskConsiderationNote')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Feature Info */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        {t('wealthOptimizer.premiumFeature')}
      </div>
    </div>
  )
}

export default WealthOptimizer
