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
import LoanForm from './LoanForm'
import StrategyResultsComponent from './StrategyResults'
import {
  calculateAllStrategies,
  formatCurrency,
  formatPercent,
} from './calculations'
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

const WealthOptimizer: React.FC = () => {
  // Auth context for user information
  const { user, isAuthenticated } = useAuth()

  // User inputs
  const [monthlyAvailable, setMonthlyAvailable] = useState(1000)
  const [isOverallBudget, setIsOverallBudget] = useState(false)
  const [loans, setLoans] = useState<Loan[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all-loans')

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

  // Load saved loans from Supabase
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
          // Add loan type and priority if they don't exist
          const enhancedLoans = userLoans.map((loan) => ({
            ...loan,
            loanType: loan.loanType || LoanType.PERSONAL,
            priority: loan.priority || LoanPriority.MEDIUM,
          }))
          setLoans(enhancedLoans)
        } else {
          // Create a default loan if user has none
          const defaultLoan = await LoanService.createDefaultLoan(user.id)
          if (defaultLoan) {
            setLoans([
              {
                ...defaultLoan,
                loanType: LoanType.STUDENT,
                priority: LoanPriority.MEDIUM,
              },
            ])
          } else {
            // Fallback to a local default if we couldn't create in the database
            setLoans([
              {
                id: 1,
                name: 'Student Loan',
                balance: 25000,
                interestRate: 5.8,
                termYears: 10,
                minimumPayment: 275,
                loanType: LoanType.STUDENT,
                priority: LoanPriority.MEDIUM,
              },
            ])
          }
        }
      } catch (error) {
        console.error('Error loading loans:', error)
        toast.error('Failed to load your loan data')

        // Fallback to default loans
        setLoans([
          {
            id: 1,
            name: 'Student Loan',
            balance: 25000,
            interestRate: 5.8,
            termYears: 10,
            minimumPayment: 275,
            loanType: LoanType.STUDENT,
            priority: LoanPriority.MEDIUM,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    loadUserLoans()
  }, [user, isAuthenticated])

  // Save loans when they change (debounced to prevent too many saves)
  const saveLoans = async () => {
    if (!isAuthenticated || !user || loans.length === 0) return

    setIsSaving(true)
    try {
      const saved = await LoanService.saveUserLoans(user.id, loans)
      if (!saved) {
        console.error('Failed to save loans')
      }
    } catch (error) {
      console.error('Error saving loans:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Debounced save function to prevent too many saves
  const debouncedSave = _.debounce(saveLoans, 1000)

  // Call the debounced save function when loans change
  useEffect(() => {
    if (loans.length > 0 && !isLoading) {
      debouncedSave()
    }

    // Clean up debounce on unmount
    return () => {
      debouncedSave.cancel()
    }
  }, [loans, isLoading])

  // Add a new empty loan
  const addLoan = () => {
    const newId =
      loans.length > 0 ? Math.max(...loans.map((loan) => loan.id)) + 1 : 1
    setLoans([
      ...loans,
      {
        id: newId,
        name: `Loan ${newId}`,
        balance: 0,
        interestRate: 0,
        termYears: 0,
        minimumPayment: 0,
        loanType: LoanType.PERSONAL,
        priority: LoanPriority.MEDIUM,
      },
    ])
  }

  // Remove a loan by id
  const removeLoan = (id: number) => {
    setLoans(loans.filter((loan) => loan.id !== id))
  }

  // Update loan details
  const updateLoan = (
    id: number,
    field: keyof Loan,
    value: string | number
  ) => {
    setLoans(
      loans.map((loan) => (loan.id === id ? { ...loan, [field]: value } : loan))
    )
  }

  // Get loans for the current tab
  const getFilteredLoans = () => {
    if (activeTab === 'all-loans') {
      return loans
    }

    const loanType = activeTab as LoanType
    return loans.filter((loan) => loan.loanType === loanType)
  }

  // Calculate total minimum monthly payment for all loans
  const calculateTotalMinimumPayment = () => {
    return loans.reduce((total, loan) => total + loan.minimumPayment, 0)
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

  // Update loan type using dropdown
  const updateLoanType = (id: number, type: string) => {
    updateLoan(id, 'loanType', type as LoanType)
  }

  // Update loan priority using dropdown
  const updateLoanPriority = (id: number, priority: string) => {
    updateLoan(id, 'priority', priority as LoanPriority)
  }

  // Calculate all strategies and determine the optimal one
  const calculateResults = () => {
    setIsCalculating(true)

    // Small delay to allow UI to update and show loading state
    setTimeout(() => {
      try {
        // Calculate different strategies
        const actualAvailable = isOverallBudget
          ? monthlyAvailable
          : monthlyAvailable + calculateTotalMinimumPayment()

        const calculationResults = calculateAllStrategies(
          loans,
          actualAvailable
        )
        const { strategies, optimal, loanComparisons } = calculationResults

        // Prepare data for the chart
        const combinedYearlyData: { [year: number]: any } = {}
        Object.keys(strategies).forEach((strategyName) => {
          strategies[strategyName].yearlyData.forEach((yearData) => {
            if (!combinedYearlyData[yearData.year]) {
              combinedYearlyData[yearData.year] = { year: yearData.year }
            }
            combinedYearlyData[yearData.year][`${strategyName}`] =
              yearData.netWorth
          })
        })

        const chartData = Object.values(combinedYearlyData)

        // Prepare totals for display
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
          loans,
          actualAvailable,
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
        toast.error('Error calculating results. Please check your inputs.')
      } finally {
        setIsCalculating(false)
      }
    }, 100)
  }

  // Function to handle loan type change using standard select
  const handleLoanTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    loanId: number
  ) => {
    updateLoanType(loanId, e.target.value)
  }

  // Function to handle loan priority change using standard select
  const handleLoanPriorityChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    loanId: number
  ) => {
    updateLoanPriority(loanId, e.target.value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading your loan data...</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>
            Optimize Your Extra Money: Loan Paydown vs. Investment
          </CardTitle>
          <CardDescription>
            This premium tool helps you decide whether to use extra money to pay
            down debt or invest in the stock market.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monthly Available Money */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="monthlyAvailable">
                {isOverallBudget
                  ? 'Total monthly budget for debt & investing'
                  : 'Monthly money available for extra payments & investing'}
              </Label>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOverallBudget(!isOverallBudget)}
                >
                  Switch to{' '}
                  {isOverallBudget ? 'extra money only' : 'total budget'}
                </Button>
                <div className="relative ml-2 group">
                  <HelpCircle className="h-5 w-5 text-gray-400" />
                  <div className="absolute right-0 w-64 p-2 bg-gray-100 rounded shadow-lg invisible group-hover:visible z-10 text-xs">
                    {isOverallBudget
                      ? 'This is your total monthly budget for debt payments and investing, including minimum payments.'
                      : 'This is extra money available after accounting for your minimum loan payments.'}
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                $
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
                ? `This includes all loan payments (minimum: $${calculateTotalMinimumPayment().toFixed(2)}/month) plus any extra for additional payments or investing.`
                : `This is money available after paying for essentials (housing, food, utilities, etc.) that can be used for extra debt payments or investing.`}
            </p>
            {isOverallBudget && (
              <div className="text-sm text-blue-600 mt-1">
                Extra available after minimum payments: $
                {calculateRemainingMoney().toFixed(2)}/month
              </div>
            )}
          </div>

          {/* Loan Type Tabs */}
          <Tabs
            defaultValue="all-loans"
            onValueChange={setActiveTab}
            value={activeTab}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all-loans">All Loans</TabsTrigger>
              <TabsTrigger value={LoanType.MORTGAGE}>Mortgage</TabsTrigger>
              <TabsTrigger value={LoanType.STUDENT}>Student</TabsTrigger>
              <TabsTrigger value={LoanType.AUTO}>Auto</TabsTrigger>
              <TabsTrigger value={LoanType.CREDIT_CARD}>
                Credit Card
              </TabsTrigger>
              <TabsTrigger value={LoanType.PERSONAL}>Personal</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="space-y-6">
                {/* Loan Form */}
                <LoanForm
                  loans={getFilteredLoans()}
                  onAddLoan={addLoan}
                  onRemoveLoan={removeLoan}
                  onUpdateLoan={updateLoan}
                  monthlyAvailable={
                    isOverallBudget
                      ? monthlyAvailable
                      : monthlyAvailable + calculateTotalMinimumPayment()
                  }
                />

                {/* Loan Type and Priority selectors using native select */}
                {getFilteredLoans().map((loan) => (
                  <div
                    key={`loan-meta-${loan.id}`}
                    className="flex items-center gap-4 mt-2 ml-4 text-sm"
                  >
                    <div className="flex items-center">
                      <span className="mr-2 text-gray-500">Loan Type:</span>
                      <select
                        className="px-3 py-1 rounded border border-gray-300 bg-white"
                        value={loan.loanType}
                        onChange={(e) => handleLoanTypeChange(e, loan.id)}
                      >
                        <option value={LoanType.MORTGAGE}>Mortgage</option>
                        <option value={LoanType.STUDENT}>Student Loan</option>
                        <option value={LoanType.AUTO}>Auto Loan</option>
                        <option value={LoanType.CREDIT_CARD}>
                          Credit Card
                        </option>
                        <option value={LoanType.PERSONAL}>Personal Loan</option>
                        <option value={LoanType.OTHER}>Other</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <span className="mr-2 text-gray-500">Priority:</span>
                      <select
                        className="px-3 py-1 rounded border border-gray-300 bg-white"
                        value={loan.priority}
                        onChange={(e) => handleLoanPriorityChange(e, loan.id)}
                      >
                        <option value={LoanPriority.HIGH}>High</option>
                        <option value={LoanPriority.MEDIUM}>Medium</option>
                        <option value={LoanPriority.LOW}>Low</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Analysis Button */}
          <div className="pt-4">
            <Button
              onClick={calculateResults}
              className="w-full"
              disabled={
                isCalculating || loans.length === 0 || monthlyAvailable <= 0
              }
            >
              {isCalculating ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Analyze My Options'
              )}
            </Button>
          </div>

          {/* Information about budget calculation */}
          <div className="mt-2 text-sm text-center text-gray-500">
            {isOverallBudget ? (
              <p>
                Analysis will consider your total budget of $
                {monthlyAvailable.toFixed(2)}/month, including minimum payments.
              </p>
            ) : (
              <p>
                Analysis will consider your extra ${monthlyAvailable.toFixed(2)}
                /month plus minimum payments of $
                {calculateTotalMinimumPayment().toFixed(2)}/month.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && !isCalculating && (
        <Card>
          <CardHeader>
            <CardTitle>Your Personalized Wealth Plan</CardTitle>
            <CardDescription>
              Based on your inputs, we've analyzed different strategies over{' '}
              {FINANCIAL_CONSTANTS.COMPARISON_YEARS} years to maximize your
              wealth.
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
        WealthOptimizer™ is a premium Penvid feature
      </div>
    </div>
  )
}

export default WealthOptimizer
