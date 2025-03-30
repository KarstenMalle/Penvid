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
} from './types'
import { generateRecommendations } from './recommendation-utils'
import { Icons } from '@/components/ui/icons'
import { useAuth } from '@/context/AuthContext'
import { LoanService } from '@/services/LoanService'
import toast from 'react-hot-toast'
import _ from 'lodash'

const WealthOptimizer: React.FC = () => {
  // Auth context for user information
  const { user, isAuthenticated } = useAuth()

  // User inputs
  const [monthlyAvailable, setMonthlyAvailable] = useState(1000)
  const [loans, setLoans] = useState<Loan[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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
          setLoans(userLoans)
        } else {
          // Create a default loan if user has none
          const defaultLoan = await LoanService.createDefaultLoan(user.id)
          if (defaultLoan) {
            setLoans([defaultLoan])
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

  // Calculate total minimum monthly payment for all loans
  const calculateTotalMinimumPayment = () => {
    return loans.reduce((total, loan) => total + loan.minimumPayment, 0)
  }

  // Calculate remaining money after paying minimums
  const calculateRemainingMoney = () => {
    const totalMinimumPayment = calculateTotalMinimumPayment()
    return Math.max(0, monthlyAvailable - totalMinimumPayment)
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
    setIsCalculating(true)

    // Small delay to allow UI to update and show loading state
    setTimeout(() => {
      try {
        // Calculate different strategies
        const calculationResults = calculateAllStrategies(
          loans,
          monthlyAvailable
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
          monthlyAvailable,
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
            <Label htmlFor="monthlyAvailable">
              Monthly money available after essentials
            </Label>
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
              This is the money left over each month after paying for essentials
              (housing, food, utilities, etc.)
            </p>
          </div>

          {/* Loans */}
          <LoanForm
            loans={loans}
            onAddLoan={addLoan}
            onRemoveLoan={removeLoan}
            onUpdateLoan={updateLoan}
          />

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
