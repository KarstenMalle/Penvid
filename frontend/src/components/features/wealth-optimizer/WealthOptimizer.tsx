// frontend/src/components/features/wealth-optimizer/WealthOptimizer.tsx
// with fixed currency handling

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
import StrategyResultsComponent from './StrategyResults'
import { calculateAllStrategies, formatPercent } from './calculations'
import {
  Loan,
  YearlyData,
  StrategyResults,
  OptimalStrategy,
  Recommendation,
  FINANCIAL_CONSTANTS,
  LoanStrategyComparison,
  LoanType,
  LoanPriority,
} from './types'
import { generateRecommendations } from './recommendation-utils'
import { Icons } from '@/components/ui/icons'
import { useAuth } from '@/context/AuthContext'
import { LoanService } from '@/services/LoanService'
import toast from 'react-hot-toast'
import _ from 'lodash'
import { HelpCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocalization } from '@/context/LocalizationContext'
import { Currency } from '@/i18n/config'
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
      <div className="p-4 text-center border rounded-md bg-gray-50">
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
          className="flex items-center p-3 border rounded-md hover:bg-gray-50"
        >
          <input
            type="checkbox"
            id={`loan-${loan.id}`}
            checked={selectedLoanIds.includes(loan.id)}
            onChange={() => onToggleLoan(loan.id)}
            className="h-4 w-4 mr-3 rounded"
          />
          <label
            htmlFor={`loan-${loan.id}`}
            className="flex flex-1 justify-between cursor-pointer"
          >
            <div>
              <div className="font-medium">{loan.name}</div>
              <div className="text-sm text-gray-500">
                {loan.loanType &&
                  t(`loans.types.${loan.loanType.toLowerCase()}`)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                <CurrencyFormatter value={loan.balance} />
              </div>
              <div className="text-sm text-gray-500">
                {formatPercent(loan.interestRate)}
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

  const { t, formatCurrency, currency, currencies, convertAmount } =
    useLocalization()

  // Results
  const [results, setResults] = useState<StrategyResults | null>(null)
  const [optimalStrategy, setOptimalStrategy] =
    useState<OptimalStrategy | null>(null)
  const [yearByYearData, setYearByYearData] = useState<any[]>([])
  const [totalInterestPaid, setTotalInterestPaid] = useState<{
    [key: string]: number
  }>({})
  const [totalInvestmentValue, setTotalInvestmentValue] = useState<{
    [key: string]: number
  }>({})
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loanComparisons, setLoanComparisons] = useState<
    LoanStrategyComparison[]
  >([])

  // Load all loans from Supabase
  useEffect(() => {
    const loadUserLoans = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Fetch user's loans
        const userLoans = await LoanService.getUserLoans(user.id)

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
  }, [user, isAuthenticated, t])

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

  // Calculate all strategies and determine the optimal one
  const calculateResults = () => {
    const selectedLoans = getSelectedLoans()

    if (selectedLoans.length === 0) {
      toast.error(t('wealthOptimizer.selectAtLeastOneLoan'))
      return
    }

    setIsCalculating(true)

    // Small delay to allow UI to update and show loading state
    setTimeout(() => {
      try {
        // If we're in a non-USD currency, we need to convert values to USD for calculation
        let selectedLoansInUSD = selectedLoans
        let monthlyAvailableInUSD = monthlyAvailable

        // Convert loans to USD if needed
        if (currency !== 'USD') {
          selectedLoansInUSD = selectedLoans.map((loan) => ({
            ...loan,
            balance: convertAmount(loan.balance, currency, 'USD'),
            minimumPayment: convertAmount(loan.minimumPayment, currency, 'USD'),
          }))

          // Convert monthly available to USD
          monthlyAvailableInUSD = convertAmount(
            monthlyAvailable,
            currency,
            'USD'
          )
        }

        // Calculate total minimum payment in USD
        const totalMinimumPaymentInUSD = selectedLoansInUSD.reduce(
          (sum, loan) => sum + loan.minimumPayment,
          0
        )

        // Calculate based on overall budget setting
        const actualAvailableInUSD = isOverallBudget
          ? monthlyAvailableInUSD // Already in USD if needed
          : monthlyAvailableInUSD + totalMinimumPaymentInUSD

        // Continue with calculations using USD values
        const calculationResults = calculateAllStrategies(
          selectedLoansInUSD,
          actualAvailableInUSD
        )
        const { strategies, optimal, loanComparisons } = calculationResults

        // Prepare data for the chart
        const combinedYearlyData: { [year: number]: any } = {}
        Object.keys(strategies).forEach((strategyName) => {
          strategies[strategyName].yearlyData.forEach((yearData) => {
            if (!combinedYearlyData[yearData.year]) {
              combinedYearlyData[yearData.year] = { year: yearData.year }
            }
            // Store net worth in chart data without any currency conversion
            // this will be handled by the components that display the data
            combinedYearlyData[yearData.year][strategyName] = yearData.netWorth
          })
        })

        const chartData = Object.values(combinedYearlyData)

        // Prepare totals for display - these are in USD and will be converted by the UI components
        const totalInterest: { [key: string]: number } = {}
        const totalInvestment: { [key: string]: number } = {}

        Object.keys(strategies).forEach((strategyName) => {
          totalInterest[strategyName] =
            strategies[strategyName].totalInterestPaid
          totalInvestment[strategyName] =
            strategies[strategyName].yearlyData[
              FINANCIAL_CONSTANTS.COMPARISON_YEARS
            ].investmentValue
        })

        // Generate personalized recommendations
        const personalRecommendations = generateRecommendations(
          selectedLoansInUSD,
          actualAvailableInUSD,
          strategies,
          optimal
        )

        // Update state with results
        setResults(strategies)
        setOptimalStrategy(optimal)
        setYearByYearData(chartData)
        setTotalInterestPaid(totalInterest)
        setTotalInvestmentValue(totalInvestment)
        setRecommendations(personalRecommendations)
        setLoanComparisons(loanComparisons)
      } catch (error) {
        console.error('Error calculating results:', error)
        toast.error(t('wealthOptimizer.errorCalculatingResults'))
      } finally {
        setIsCalculating(false)
      }
    }, 100)
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
              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
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
                  <div className="absolute right-0 w-64 p-2 bg-gray-100 rounded shadow-lg invisible group-hover:visible z-10 text-xs">
                    {isOverallBudget
                      ? t('wealthOptimizer.totalBudgetHelp')
                      : t('wealthOptimizer.extraMoneyHelp')}
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                {currencies[currency].symbol}
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
            <p className="text-sm text-gray-500">
              {isOverallBudget
                ? t('wealthOptimizer.totalBudgetDescription', {
                    minimumPayment: formatCurrency(
                      calculateTotalMinimumPayment()
                    ),
                  })
                : t('wealthOptimizer.extraMoneyDescription')}
            </p>
            {isOverallBudget && (
              <div className="text-sm text-blue-600 mt-1">
                {t('wealthOptimizer.extraAvailableAfterMinimumPayments')}{' '}
                {formatCurrency(calculateRemainingMoney())}
                {t('wealthOptimizer.perMonth')}
              </div>
            )}
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
          <div className="mt-2 text-sm text-center text-gray-500">
            {isOverallBudget ? (
              <p>
                {t('wealthOptimizer.totalBudgetInfo', {
                  totalBudget: formatCurrency(monthlyAvailable),
                })}
              </p>
            ) : (
              <p>
                {t('wealthOptimizer.extraBudgetInfo', {
                  extraMoney: formatCurrency(monthlyAvailable),
                  minimumPayments: formatCurrency(
                    calculateTotalMinimumPayment()
                  ),
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && !isCalculating && (
        <Card>
          <CardHeader>
            <CardTitle>{t('wealthOptimizer.personalizedWealthPlan')}</CardTitle>
            <CardDescription>
              {t('wealthOptimizer.basedOnInputs', {
                years: FINANCIAL_CONSTANTS.COMPARISON_YEARS,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StrategyResultsComponent
              results={results}
              optimalStrategy={optimalStrategy!}
              yearByYearData={yearByYearData}
              totalInterestPaid={totalInterestPaid}
              totalInvestmentValue={totalInvestmentValue}
              recommendations={recommendations}
              loanComparisons={loanComparisons}
            />
          </CardContent>
        </Card>
      )}

      {/* Premium Feature Info */}
      <div className="text-center text-xs text-gray-500">
        {t('wealthOptimizer.premiumFeature')}
      </div>
    </div>
  )
}

export default WealthOptimizer
