'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LoanDashboard from '@/components/features/wealth-optimizer/LoanDashboard'
import MonthlyProgressTracker, {
  PaymentRecord,
} from '@/components/features/wealth-optimizer/MonthlyProgressTracker'
import {
  Loan,
  LoanStrategyComparison,
} from '@/components/features/wealth-optimizer/types'
import { LoanService } from '@/services/LoanService'
import { useAuth } from '@/context/AuthContext'
import { Icons } from '@/components/ui/icons'
import WealthOptimizer from '@/components/features/wealth-optimizer/WealthOptimizer'
import { calculateAllStrategies } from '@/components/features/wealth-optimizer/calculations'
import toast from 'react-hot-toast'

export default function LoanManagementPage() {
  const { user, isAuthenticated, loading } = useAuth()

  // State for loan data
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [monthlyBudget, setMonthlyBudget] = useState(1000)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loanComparisons, setLoanComparisons] = useState<
    LoanStrategyComparison[]
  >([])
  const [netWorthData, setNetWorthData] = useState<any[]>([])
  const [calculatingStrategy, setCalculatingStrategy] = useState(false)

  // Load saved loans and payment history from Supabase
  useEffect(() => {
    const loadUserData = async () => {
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

        // In a real implementation, we'd also load payment history from Supabase
        // For now, just use a mock history
        setPaymentHistory(getMockPaymentHistory(userLoans))

        // Calculate initial strategies
        calculateInitialStrategies(userLoans, monthlyBudget)
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('Failed to load your loan data')

        // Fallback to default loans
        const defaultLoans = [
          {
            id: 1,
            name: 'Student Loan',
            balance: 25000,
            interestRate: 5.8,
            termYears: 10,
            minimumPayment: 275,
          },
        ]
        setLoans(defaultLoans)
        setPaymentHistory(getMockPaymentHistory(defaultLoans))
        calculateInitialStrategies(defaultLoans, monthlyBudget)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [user, isAuthenticated])

  // Mock payment history for demo purposes
  const getMockPaymentHistory = (loans: Loan[]): PaymentRecord[] => {
    const history: PaymentRecord[] = []
    const now = new Date()

    // Generate 6 months of payment history
    for (let i = 0; i < 6; i++) {
      const date = new Date(now)
      date.setMonth(date.getMonth() - i)
      const formattedDate = date.toISOString().slice(0, 10)

      loans.forEach((loan) => {
        // Regular payment
        history.push({
          id: `history-${i}-${loan.id}-regular`,
          date: formattedDate,
          loanId: loan.id,
          amount: loan.minimumPayment,
          isExtraPayment: false,
        })

        // Random extra payments for some months
        if (Math.random() > 0.7) {
          history.push({
            id: `history-${i}-${loan.id}-extra`,
            date: formattedDate,
            loanId: loan.id,
            amount: Math.round(loan.minimumPayment * 0.5),
            isExtraPayment: true,
          })
        }
      })
    }

    return history
  }

  // Update loan
  const handleUpdateLoan = (updatedLoan: Loan) => {
    const updatedLoans = loans.map((loan) =>
      loan.id === updatedLoan.id ? updatedLoan : loan
    )
    setLoans(updatedLoans)

    // Save to database
    if (isAuthenticated && user) {
      LoanService.saveUserLoans(user.id, updatedLoans)
    }
  }

  // Add payment record
  const handleAddPayment = (payment: PaymentRecord) => {
    setPaymentHistory([payment, ...paymentHistory])

    // In a real implementation, save payment to Supabase
    // For now, we just update the local state
  }

  // Calculate initial strategies
  const calculateInitialStrategies = (loans: Loan[], budget: number) => {
    try {
      // Calculate different strategies
      const calculationResults = calculateAllStrategies(loans, budget)
      setLoanComparisons(calculationResults.loanComparisons)

      // Prepare net worth data for chart
      const netWorthDataPoints = calculationResults.strategies[
        calculationResults.optimal.name
      ].yearlyData.map((yearData) => ({
        year: yearData.year,
        netWorth: yearData.netWorth,
        investments: yearData.investmentValue,
        debt: -yearData.loanBalance,
      }))

      setNetWorthData(netWorthDataPoints)
    } catch (error) {
      console.error('Error calculating strategies:', error)
    }
  }

  // Handle strategy refresh
  const handleRefreshStrategy = () => {
    setCalculatingStrategy(true)

    // Small delay to show loading state
    setTimeout(() => {
      calculateInitialStrategies(loans, monthlyBudget)
      setCalculatingStrategy(false)
      toast.success('Strategy updated based on current loan status')
    }, 500)
  }

  // Show loading state
  if (loading || isLoading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your loan data...</p>
        </div>
      </div>
    )
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Loan Manager</CardTitle>
            <CardDescription>Sign in to access this tool</CardDescription>
          </CardHeader>
          <CardContent className="text-center p-6">
            <p className="mb-6">
              You need to be logged in to manage your loans.
            </p>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
              onClick={() =>
                (window.location.href =
                  '/login?redirect=/wealth-tools/loan-manager')
              }
            >
              Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Loan Manager</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Track your debt payoff journey and optimize your strategy
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Tracker</TabsTrigger>
          <TabsTrigger value="optimizer">Strategy Optimizer</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {calculatingStrategy ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-lg text-gray-600">
                  Updating your strategy...
                </p>
              </div>
            </div>
          ) : (
            <LoanDashboard
              loans={loans}
              monthlyBudget={monthlyBudget}
              paymentHistory={paymentHistory}
              loanComparisons={loanComparisons}
              netWorthData={netWorthData}
              onRefreshStrategy={handleRefreshStrategy}
            />
          )}
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyProgressTracker
            loans={loans}
            onUpdateLoan={handleUpdateLoan}
            monthlyBudget={monthlyBudget}
            onUpdateMonthlyBudget={setMonthlyBudget}
            paymentHistory={paymentHistory}
            onAddPayment={handleAddPayment}
          />
        </TabsContent>

        <TabsContent value="optimizer">
          <WealthOptimizer />
        </TabsContent>
      </Tabs>
    </div>
  )
}
