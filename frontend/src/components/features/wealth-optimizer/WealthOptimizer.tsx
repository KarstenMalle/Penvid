'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLocalization } from '@/context/LocalizationContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { LoanService } from '@/services/LoanService'
import { FinancialApiService } from '@/services/FinancialApiService'
import { LoanCalculationService } from '@/services/LoanCalculationService'
import { Separator } from '@/components/ui/separator'
import StrategyResults from '@/components/features/wealth-optimizer/StrategyResults'
import LoanComparisonCard from '@/components/features/wealth-optimizer/LoanComparisonCard'
import { Icons } from '@/components/ui/icons'
import {
  CircleCheck,
  ChevronsUpDown,
  DollarSign,
  TrendingUp,
  Info,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function WealthOptimizer() {
  const { user, isAuthenticated, loading } = useAuth()
  const { t, formatCurrency } = useLocalization()
  const router = useRouter()

  // State variables
  const [loans, setLoans] = useState<Loan[]>([])
  const [selectedLoanIds, setSelectedLoanIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [monthlyBudget, setMonthlyBudget] = useState(1000)
  const [showExtraMoney, setShowExtraMoney] = useState(false)
  const [riskFactor, setRiskFactor] = useState(30)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [inflationRate, setInflationRate] = useState(2.5)
  const [annualReturn, setAnnualReturn] = useState(7)
  const [calculationResults, setCalculationResults] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [recommendations, setRecommendations] = useState<any[]>([])

  // Load user loans when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Fetch user's loans from API
        const userLoans = await LoanService.getUserLoans(user.id)
        setLoans(userLoans)

        // Select all loans by default
        setSelectedLoanIds(userLoans.map((loan) => loan.id))

        // Fetch user settings from API
        const userSettings = await FinancialApiService.getUserSettings(user.id)
        if (userSettings) {
          setInflationRate(userSettings.expected_inflation * 100)
          setAnnualReturn(userSettings.expected_investment_return * 100)
          setRiskFactor(userSettings.risk_tolerance * 100)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('Failed to load your financial data')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [user, isAuthenticated])

  // Filter selected loans
  const selectedLoans = useMemo(() => {
    return loans.filter((loan) => selectedLoanIds.includes(loan.id))
  }, [loans, selectedLoanIds])

  // Calculate total minimum payments
  const totalMinimumPayment = useMemo(() => {
    return selectedLoans.reduce((sum, loan) => sum + loan.minimumPayment, 0)
  }, [selectedLoans])

  // Calculate extra money available
  const extraMoneyAvailable = useMemo(() => {
    return Math.max(0, monthlyBudget - totalMinimumPayment)
  }, [monthlyBudget, totalMinimumPayment])

  // Get budget for calculations
  const calculationBudget = useMemo(() => {
    return showExtraMoney ? extraMoneyAvailable : monthlyBudget
  }, [showExtraMoney, extraMoneyAvailable, monthlyBudget])

  // Toggle loan selection
  const toggleLoanSelection = (loanId: number) => {
    if (selectedLoanIds.includes(loanId)) {
      setSelectedLoanIds(selectedLoanIds.filter((id) => id !== loanId))
    } else {
      setSelectedLoanIds([...selectedLoanIds, loanId])
    }
  }

  // Select all loans
  const selectAllLoans = () => {
    setSelectedLoanIds(loans.map((loan) => loan.id))
  }

  // Clear all selections
  const clearAllLoans = () => {
    setSelectedLoanIds([])
  }

  // Calculate financial strategies
  const calculateStrategies = async () => {
    if (selectedLoans.length === 0) {
      toast.error(t('wealthOptimizer.selectAtLeastOneLoan'))
      return
    }

    setIsCalculating(true)
    try {
      // For a real implementation, call the backend API
      const results = await FinancialApiService.getFinancialStrategy(
        user?.id || '',
        selectedLoans,
        calculationBudget,
        annualReturn / 100,
        inflationRate / 100,
        riskFactor / 100
      )

      setCalculationResults(results)

      // Generate recommendations based on results
      const recommendations =
        await LoanCalculationService.generateRecommendations({
          loans: selectedLoans,
          monthly_available: calculationBudget,
          results: results,
          optimal_strategy: results.recommendation,
          loan_comparisons: results.loanComparisons,
        })

      setRecommendations(recommendations)

      // Switch to results tab
      setActiveTab('results')
    } catch (error) {
      console.error('Error calculating strategies:', error)
      toast.error(t('wealthOptimizer.errorCalculatingResults'))
    } finally {
      setIsCalculating(false)
    }
  }

  // Handle monthly budget change
  const handleMonthlyBudgetChange = (value: string) => {
    const budget = parseFloat(value)
    if (!isNaN(budget) && budget >= 0) {
      setMonthlyBudget(budget)
    }
  }

  // Render loading state
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">
            Loading your financial data...
          </p>
        </div>
      </div>
    )
  }

  // Render login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>WealthOptimizer™</CardTitle>
            <CardDescription>
              Sign in to access this premium wealth-building tool
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center p-6">
            <p className="mb-6">
              You need to be logged in to access the WealthOptimizer tool.
            </p>
            <Button
              className="mx-auto"
              onClick={() =>
                (window.location.href =
                  '/login?redirect=/wealth-tools/wealth-optimizer')
              }
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render main content
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('wealthOptimizer.title')}</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          {t('wealthOptimizer.description')}
        </p>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Input Parameters</TabsTrigger>
          <TabsTrigger value="results" disabled={!calculationResults}>
            Results
          </TabsTrigger>
          <TabsTrigger value="comparisons" disabled={!calculationResults}>
            Loan Comparisons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Loan Selection */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('wealthOptimizer.selectLoans')}</CardTitle>
                <CardDescription>
                  {selectedLoanIds.length} {t('wealthOptimizer.of')}{' '}
                  {loans.length} {t('wealthOptimizer.loansSelected')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      {t('wealthOptimizer.noLoansYet')}
                    </p>
                    <Button onClick={() => router.push('/loans')}>
                      {t('wealthOptimizer.addLoansToStart')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllLoans}
                      >
                        {t('wealthOptimizer.selectAll')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllLoans}
                      >
                        {t('wealthOptimizer.clearAll')}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {loans.map((loan) => (
                        <div
                          key={loan.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            selectedLoanIds.includes(loan.id)
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center">
                            <Checkbox
                              id={`loan-${loan.id}`}
                              checked={selectedLoanIds.includes(loan.id)}
                              onCheckedChange={() =>
                                toggleLoanSelection(loan.id)
                              }
                              className="mr-3 h-5 w-5"
                            />
                            <div>
                              <Label
                                htmlFor={`loan-${loan.id}`}
                                className="font-medium cursor-pointer"
                              >
                                {loan.name}
                              </Label>
                              <div className="text-sm text-gray-500">
                                {formatCurrency(loan.balance)} at{' '}
                                {loan.interestRate}%
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(loan.minimumPayment)}/
                            {t('wealthOptimizer.month')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild>
                  <a href="/loans">{t('wealthOptimizer.manageLoans')}</a>
                </Button>
              </CardFooter>
            </Card>

            {/* Budget Input */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {showExtraMoney
                    ? t('wealthOptimizer.monthlyExtraMoney')
                    : t('wealthOptimizer.totalMonthlyBudget')}
                </CardTitle>
                <CardDescription>
                  <button
                    onClick={() => setShowExtraMoney(!showExtraMoney)}
                    className="text-blue-600 hover:underline flex items-center text-xs"
                  >
                    {t('wealthOptimizer.switchTo')}{' '}
                    {showExtraMoney
                      ? t('wealthOptimizer.totalBudget')
                      : t('wealthOptimizer.extraMoneyOnly')}
                    <ChevronsUpDown className="ml-1 h-3 w-3" />
                  </button>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="monthly-budget">
                      {showExtraMoney
                        ? t('wealthOptimizer.extraMoneyTooltip')
                        : t('wealthOptimizer.totalBudgetTooltip')}
                    </Label>
                    <div
                      className="text-sm text-gray-500 cursor-help"
                      title={
                        showExtraMoney
                          ? t('wealthOptimizer.extraMoneyTooltip')
                          : t('wealthOptimizer.totalBudgetTooltip')
                      }
                    >
                      <Info className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      $
                    </span>
                    <Input
                      id="monthly-budget"
                      type="number"
                      value={monthlyBudget}
                      onChange={(e) =>
                        handleMonthlyBudgetChange(e.target.value)
                      }
                      className="pl-8"
                      min="0"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                      {t('wealthOptimizer.perMonth')}
                    </span>
                  </div>
                </div>

                {showExtraMoney && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span>
                        {t('wealthOptimizer.extraAvailableAfterMinimums')}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(extraMoneyAvailable)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('wealthOptimizer.totalBudgetDescription', {
                        minimumPayment: formatCurrency(totalMinimumPayment),
                      })}
                    </div>
                  </div>
                )}

                {!showExtraMoney && totalMinimumPayment > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span>
                        {t(
                          'wealthOptimizer.extraAvailableAfterMinimumPayments'
                        )}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(
                          Math.max(0, monthlyBudget - totalMinimumPayment)
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('wealthOptimizer.extraMoneyDescription')}
                    </div>
                  </div>
                )}

                {/* Advanced Settings */}
                <div className="pt-4 border-t">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAdvancedSettings(!showAdvancedSettings)
                    }
                    className="text-sm flex items-center text-gray-600"
                  >
                    {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
                    <ChevronsUpDown className="ml-1 h-4 w-4" />
                  </button>

                  {showAdvancedSettings && (
                    <div className="space-y-4 mt-4">
                      {/* Risk Adjustment Factor */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="risk-factor">
                            {t('wealthOptimizer.riskAdjustmentFactor')}
                          </Label>
                          <span>{riskFactor}%</span>
                        </div>
                        <Slider
                          id="risk-factor"
                          min={0}
                          max={100}
                          step={1}
                          value={[riskFactor]}
                          onValueChange={(values) => setRiskFactor(values[0])}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            {t('wealthOptimizer.lowerRiskConservative')}
                          </span>
                          <span>
                            {t('wealthOptimizer.higherRiskAggressive')}
                          </span>
                        </div>
                        <div className="text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md mt-2">
                          <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">
                            {t('wealthOptimizer.riskAdjustmentTitle')}
                          </p>
                          <p className="text-xs">
                            {t('wealthOptimizer.riskAdjustmentDescription', {
                              factor: riskFactor,
                              expectedReturn: annualReturn.toFixed(1),
                              adjustedReturn: (
                                annualReturn *
                                (riskFactor / 100)
                              ).toFixed(1),
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Expected Investment Return */}
                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex justify-between">
                          <Label htmlFor="annual-return">
                            Expected Investment Return
                          </Label>
                          <span>{annualReturn}%</span>
                        </div>
                        <Slider
                          id="annual-return"
                          min={0}
                          max={15}
                          step={0.1}
                          value={[annualReturn]}
                          onValueChange={(values) => setAnnualReturn(values[0])}
                        />
                        <div className="text-xs text-gray-500">
                          Historical S&P 500 average: 10.06% (nominal), 6.78%
                          (inflation-adjusted)
                        </div>
                      </div>

                      {/* Inflation Rate */}
                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex justify-between">
                          <Label htmlFor="inflation-rate">
                            Expected Inflation Rate
                          </Label>
                          <span>{inflationRate}%</span>
                        </div>
                        <Slider
                          id="inflation-rate"
                          min={0}
                          max={10}
                          step={0.1}
                          value={[inflationRate]}
                          onValueChange={(values) =>
                            setInflationRate(values[0])
                          }
                        />
                        <div className="text-xs text-gray-500">
                          Historical US average inflation: 3.28% (1913-2023)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={calculateStrategies}
                  disabled={selectedLoans.length === 0 || isCalculating}
                >
                  {isCalculating ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      {t('wealthOptimizer.calculating')}
                    </>
                  ) : (
                    t('wealthOptimizer.analyzeOptions')
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Fair Comparison Explanation */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>{t('wealthOptimizer.fairComparisonTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('wealthOptimizer.fairComparisonExplanation')}</p>

                  <div className="p-4 border rounded-md">
                    <h3 className="font-medium mb-2">
                      {t('wealthOptimizer.commonMistakeTitle')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('wealthOptimizer.commonMistakeDescription')}
                    </p>
                  </div>

                  <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                    <h3 className="font-medium mb-2">
                      {t('wealthOptimizer.ourApproachTitle')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('wealthOptimizer.ourApproachDescription')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-medium mb-2">Why this matters:</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('wealthOptimizer.fairComparisonConclusion')}
                    </p>
                  </div>

                  <div className="relative p-5">
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200"></div>

                    <div className="relative z-10 mb-6">
                      <div className="flex items-start">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mr-4">
                          <DollarSign className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Pay Down Debt</h4>
                          <p className="text-sm text-gray-500">
                            Guaranteed return equal to your interest rate
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-start">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mr-4">
                          <TrendingUp className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Invest</h4>
                          <p className="text-sm text-gray-500">
                            Potential for higher returns, but with market risk
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          {calculationResults ? (
            <StrategyResults
              results={calculationResults}
              recommendations={recommendations}
              riskFactor={riskFactor}
              annualReturn={annualReturn}
              onCompareLoans={() => setActiveTab('comparisons')}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Run the analysis first to see results
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comparisons">
          {calculationResults?.loanComparisons ? (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t('loanComparison.loanByLoanStrategy')}
                  </CardTitle>
                  <CardDescription>
                    {t('loanComparison.breakdown')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
                    <h3 className="font-medium mb-2">
                      {t('loanComparison.riskAdjustedAnalysis')}
                    </h3>
                    <p className="text-sm">
                      {t('loanComparison.riskAdjustedExplanation', {
                        spReturn: annualReturn.toFixed(1),
                        riskAdjustedReturn: (
                          annualReturn *
                          (riskFactor / 100)
                        ).toFixed(1),
                      })}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-md flex items-center">
                        <CircleCheck className="w-5 h-5 mr-2" />
                        {t('loanComparison.highInterestLoanStrategy', {
                          threshold: (
                            annualReturn *
                            (riskFactor / 100)
                          ).toFixed(1),
                        })}
                      </h3>
                      <div className="space-y-6">
                        {calculationResults.loanComparisons
                          .filter(
                            (comparison: any) =>
                              comparison.interestRate >
                              annualReturn * (riskFactor / 100)
                          )
                          .map((comparison: any) => (
                            <LoanComparisonCard
                              key={comparison.loanId}
                              comparison={comparison}
                              riskFactor={riskFactor / 100}
                              annualReturn={annualReturn / 100}
                              shouldPayDown={true}
                              riskCategory="high"
                            />
                          ))}
                        {calculationResults.loanComparisons.filter(
                          (comparison: any) =>
                            comparison.interestRate >
                            annualReturn * (riskFactor / 100)
                        ).length === 0 && (
                          <p className="text-center text-gray-500 py-4">
                            No high-interest loans found
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-md flex items-center">
                        <CircleCheck className="w-5 h-5 mr-2" />
                        {t('loanComparison.mediumInterestLoanStrategy', {
                          lower: (
                            annualReturn * (riskFactor / 100) -
                            1
                          ).toFixed(1),
                          upper: (
                            annualReturn * (riskFactor / 100) +
                            1
                          ).toFixed(1),
                        })}
                      </h3>
                      <div className="space-y-6">
                        {calculationResults.loanComparisons
                          .filter(
                            (comparison: any) =>
                              comparison.interestRate <=
                                annualReturn * (riskFactor / 100) + 1 &&
                              comparison.interestRate >=
                                annualReturn * (riskFactor / 100) - 1
                          )
                          .map((comparison: any) => (
                            <LoanComparisonCard
                              key={comparison.loanId}
                              comparison={comparison}
                              riskFactor={riskFactor / 100}
                              annualReturn={annualReturn / 100}
                              shouldPayDown={
                                comparison.interestRate >=
                                annualReturn * (riskFactor / 100)
                              }
                              riskCategory="medium"
                            />
                          ))}
                        {calculationResults.loanComparisons.filter(
                          (comparison: any) =>
                            comparison.interestRate <=
                              annualReturn * (riskFactor / 100) + 1 &&
                            comparison.interestRate >=
                              annualReturn * (riskFactor / 100) - 1
                        ).length === 0 && (
                          <p className="text-center text-gray-500 py-4">
                            No medium-interest loans found
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-4 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-md flex items-center">
                        <CircleCheck className="w-5 h-5 mr-2" />
                        {t('loanComparison.lowInterestLoanStrategy', {
                          threshold: (
                            annualReturn * (riskFactor / 100) -
                            1
                          ).toFixed(1),
                        })}
                      </h3>
                      <div className="space-y-6">
                        {calculationResults.loanComparisons
                          .filter(
                            (comparison: any) =>
                              comparison.interestRate <
                              annualReturn * (riskFactor / 100) - 1
                          )
                          .map((comparison: any) => (
                            <LoanComparisonCard
                              key={comparison.loanId}
                              comparison={comparison}
                              riskFactor={riskFactor / 100}
                              annualReturn={annualReturn / 100}
                              shouldPayDown={false}
                              riskCategory="low"
                            />
                          ))}
                        {calculationResults.loanComparisons.filter(
                          (comparison: any) =>
                            comparison.interestRate <
                            annualReturn * (riskFactor / 100) - 1
                        ).length === 0 && (
                          <p className="text-center text-gray-500 py-4">
                            No low-interest loans found
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('loanComparison.ourRecommendation')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    {t('loanComparison.tieredStrategyExplanation')}
                  </p>

                  <div className="space-y-4">
                    <div className="flex">
                      <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-full flex items-center justify-center h-8 w-8 mr-3 flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p>
                          {t('loanComparison.tier1', {
                            threshold: (
                              annualReturn *
                              (riskFactor / 100)
                            ).toFixed(1),
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-full flex items-center justify-center h-8 w-8 mr-3 flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p>
                          {t('loanComparison.tier2', {
                            lower: (
                              annualReturn * (riskFactor / 100) -
                              1
                            ).toFixed(1),
                            upper: (annualReturn * (riskFactor / 100)).toFixed(
                              1
                            ),
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full flex items-center justify-center h-8 w-8 mr-3 flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p>
                          {t('loanComparison.tier3', {
                            lower: (
                              annualReturn * (riskFactor / 100) -
                              2
                            ).toFixed(1),
                            upper: (
                              annualReturn * (riskFactor / 100) -
                              1
                            ).toFixed(1),
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full flex items-center justify-center h-8 w-8 mr-3 flex-shrink-0">
                        4
                      </div>
                      <div>
                        <p>
                          {t('loanComparison.tier4', {
                            threshold: (
                              annualReturn * (riskFactor / 100) -
                              2
                            ).toFixed(1),
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-medium mb-2">
                      {t('loanComparison.balanceRiskReturn')}
                    </h3>
                    <p className="text-sm">
                      {t('loanComparison.balanceExplanation')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {t('wealthOptimizer.noLoansToCompare')}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
