'use client'

import React, { useState, useEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoanService } from '@/services/LoanService'
import { LoanCalculationService } from '@/services/LoanCalculationService'
import {
  Loan,
  LoanType,
  LoanStrategyComparison,
} from '@/components/features/wealth-optimizer/types'
import { calculateAllStrategies } from '@/components/features/wealth-optimizer/calculations'
import LoanDashboard from '@/components/features/wealth-optimizer/LoanDashboard'
import MonthlyProgressTracker, {
  PaymentRecord,
} from '@/components/features/wealth-optimizer/MonthlyProgressTracker'
import { formatPercent } from '@/components/features/wealth-optimizer/format-utils'
import { Icons } from '@/components/ui/icons'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

// Define payment record interface
interface PaymentRecord {
  id: string
  date: string
  loanId: number
  amount: number
  isExtraPayment: boolean
}

export default function LoanManagementPage() {
  const { user, isAuthenticated, loading } = useAuth()
  const { t, currency, formatCurrency } = useLocalization()
  const router = useRouter()

  // State
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingLoan, setIsAddingLoan] = useState(false)
  const [monthlyBudget, setMonthlyBudget] = useState(1000)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loanComparisons, setLoanComparisons] = useState<
    LoanStrategyComparison[]
  >([])
  const [netWorthData, setNetWorthData] = useState<any[]>([])
  const [calculatingStrategy, setCalculatingStrategy] = useState(false)
  const [newLoan, setNewLoan] = useState<Partial<Loan>>({
    name: '',
    balance: 0,
    interestRate: 0,
    termYears: 0,
    minimumPayment: 0,
    loanType: LoanType.PERSONAL,
  })

  // Load saved loans and payment history
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
                loanType: LoanType.STUDENT,
              },
            ])
          }
        }

        // In a real implementation, we'd also load payment history from API
        // For now, use a mock history
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
            loanType: LoanType.STUDENT,
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

  // Calculate initial strategies
  const calculateInitialStrategies = (loans: Loan[], budget: number) => {
    try {
      setCalculatingStrategy(true)
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
      setCalculatingStrategy(false)
    } catch (error) {
      console.error('Error calculating strategies:', error)
      setCalculatingStrategy(false)
    }
  }

  // Handle adding a new loan
  const handleAddLoan = async () => {
    if (!isAuthenticated || !user || !newLoan.name) return

    setIsLoading(true)
    try {
      // Generate a new ID for the loan
      const newId =
        loans.length > 0 ? Math.max(...loans.map((loan) => loan.id)) + 1 : 1

      // Create the loan object
      const loanToAdd: Loan = {
        id: newId,
        name: newLoan.name,
        balance: newLoan.balance || 0,
        interestRate: newLoan.interestRate || 0,
        termYears: newLoan.termYears || 0,
        minimumPayment: newLoan.minimumPayment || 0,
        loanType: newLoan.loanType || LoanType.PERSONAL,
      }

      // Update local state
      const updatedLoans = [...loans, loanToAdd]
      setLoans(updatedLoans)

      // Save to database
      await LoanService.saveUserLoans(user.id, updatedLoans)

      // Calculate loan strategies with the new loan
      calculateInitialStrategies(updatedLoans, monthlyBudget)

      // Reset form and close dialog
      setNewLoan({
        name: '',
        balance: 0,
        interestRate: 0,
        termYears: 0,
        minimumPayment: 0,
        loanType: LoanType.PERSONAL,
      })
      setIsAddingLoan(false)

      toast.success('Loan added successfully')
    } catch (error) {
      console.error('Error adding loan:', error)
      toast.error('Failed to add loan')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate loan payment based on other fields
  const calculateLoanPayment = async () => {
    if (!newLoan.balance || !newLoan.interestRate || !newLoan.termYears) return

    try {
      const result = await LoanCalculationService.calculateLoanDetails({
        principal: newLoan.balance,
        annual_rate: newLoan.interestRate / 100, // Convert to decimal
        term_years: newLoan.termYears,
      })

      if (result && result.monthly_payment) {
        setNewLoan({
          ...newLoan,
          minimumPayment: Math.ceil(result.monthly_payment),
        })
      }
    } catch (error) {
      console.error('Error calculating loan payment:', error)
    }
  }

  // Handle loan input changes
  const handleLoanChange = (field: string, value: any) => {
    setNewLoan({
      ...newLoan,
      [field]: value,
    })
  }

  // Update loan
  const handleUpdateLoan = async (updatedLoan: Loan) => {
    const updatedLoans = loans.map((loan) =>
      loan.id === updatedLoan.id ? updatedLoan : loan
    )
    setLoans(updatedLoans)

    // Save to database
    if (isAuthenticated && user) {
      try {
        await LoanService.saveUserLoans(user.id, updatedLoans)
        calculateInitialStrategies(updatedLoans, monthlyBudget) // Recalculate strategies
        toast.success('Loan updated successfully')
      } catch (error) {
        console.error('Error updating loan:', error)
        toast.error('Failed to save loan changes')
      }
    }
  }

  // Add payment record
  const handleAddPayment = (payment: PaymentRecord) => {
    setPaymentHistory([payment, ...paymentHistory])

    // Update the loan balance
    const loanToUpdate = loans.find((loan) => loan.id === payment.loanId)
    if (loanToUpdate) {
      const updatedLoan = {
        ...loanToUpdate,
        balance: Math.max(0, loanToUpdate.balance - payment.amount),
      }

      handleUpdateLoan(updatedLoan)
    }

    // In a real implementation, save payment to database
    // For now, we just update the local state
  }

  // Handle strategy refresh
  const handleRefreshStrategy = () => {
    setCalculatingStrategy(true)

    // Small delay to show loading state
    setTimeout(() => {
      calculateInitialStrategies(loans, monthlyBudget)
      toast.success('Strategy updated based on current loan status')
    }, 500)
  }

  // Navigate to loan details
  const handleViewLoanDetails = (loanId: number) => {
    router.push(`/loans/${loanId}`)
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
            <Button
              onClick={() =>
                (window.location.href =
                  '/login?redirect=/wealth-tools/loan-manager')
              }
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Loan Manager</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Track your debt payoff journey and optimize your strategy
          </p>
        </div>
        <Button onClick={() => setIsAddingLoan(true)}>Add New Loan</Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Tracker</TabsTrigger>
          <TabsTrigger value="loans">My Loans</TabsTrigger>
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

        <TabsContent value="loans">
          {loans.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-4 inline-flex mb-4">
                <Icons.dollar className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Loans Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                Start by adding your first loan to track your debt payoff
                journey.
              </p>
              <Button onClick={() => setIsAddingLoan(true)}>
                Add Your First Loan
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {loans.map((loan) => (
                <Card key={loan.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle>{loan.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`
                          ${loan.loanType === LoanType.PERSONAL && 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'}
                          ${loan.loanType === LoanType.STUDENT && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'}
                          ${loan.loanType === LoanType.MORTGAGE && 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'}
                          ${loan.loanType === LoanType.AUTO && 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'}
                          ${loan.loanType === LoanType.CREDIT_CARD && 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'}
                        `}
                      >
                        {loan.loanType || 'Other'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Balance</p>
                        <p className="text-xl font-bold">
                          <CurrencyFormatter value={loan.balance} />
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Interest Rate</p>
                        <p className="text-xl font-bold">
                          {formatPercent(loan.interestRate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Monthly Payment</p>
                        <p className="text-xl font-bold">
                          <CurrencyFormatter value={loan.minimumPayment} />
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Payoff Progress</span>
                        <span>
                          {/* Calculate a rough estimate of progress */}
                          {Math.min(
                            100,
                            Math.round(
                              (1 -
                                loan.balance /
                                  (loan.balance +
                                    loan.minimumPayment *
                                      loan.termYears *
                                      12 *
                                      0.2)) *
                                100
                            )
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (1 -
                                  loan.balance /
                                    (loan.balance +
                                      loan.minimumPayment *
                                        loan.termYears *
                                        12 *
                                        0.2)) *
                                  100
                              )
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewLoanDetails(loan.id)}
                    >
                      View Details
                    </Button>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewLoan(loan)
                          setIsAddingLoan(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (
                            confirm(
                              'Are you sure you want to delete this loan?'
                            )
                          ) {
                            const updatedLoans = loans.filter(
                              (l) => l.id !== loan.id
                            )
                            setLoans(updatedLoans)

                            if (user) {
                              try {
                                await LoanService.saveUserLoans(
                                  user.id,
                                  updatedLoans
                                )
                                toast.success('Loan deleted successfully')

                                // Recalculate strategies
                                calculateInitialStrategies(
                                  updatedLoans,
                                  monthlyBudget
                                )
                              } catch (error) {
                                console.error('Error deleting loan:', error)
                                toast.error('Failed to delete loan')
                              }
                            }
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Loan Dialog */}
      <Dialog open={isAddingLoan} onOpenChange={setIsAddingLoan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newLoan.id ? 'Edit Loan' : 'Add New Loan'}
            </DialogTitle>
            <DialogDescription>
              {newLoan.id
                ? 'Update the details of your existing loan'
                : 'Enter the details of your loan to track it'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="loan-name">Loan Name</Label>
              <Input
                id="loan-name"
                placeholder="e.g., Student Loan, Home Mortgage"
                value={newLoan.name}
                onChange={(e) => handleLoanChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan-type">Loan Type</Label>
              <Select
                value={newLoan.loanType}
                onValueChange={(value) => handleLoanChange('loanType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LoanType.PERSONAL}>
                    Personal Loan
                  </SelectItem>
                  <SelectItem value={LoanType.STUDENT}>Student Loan</SelectItem>
                  <SelectItem value={LoanType.MORTGAGE}>Mortgage</SelectItem>
                  <SelectItem value={LoanType.AUTO}>Auto Loan</SelectItem>
                  <SelectItem value={LoanType.CREDIT_CARD}>
                    Credit Card
                  </SelectItem>
                  <SelectItem value={LoanType.HOME_LOAN}>Home Loan</SelectItem>
                  <SelectItem value={LoanType.MORTGAGE_BOND}>
                    Mortgage Bond
                  </SelectItem>
                  <SelectItem value={LoanType.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan-balance">Current Balance</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  {currency === 'USD'
                    ? '$'
                    : currency === 'DKK'
                      ? 'kr'
                      : currency}
                </span>
                <Input
                  id="loan-balance"
                  type="number"
                  placeholder="e.g., 10000"
                  value={newLoan.balance || ''}
                  onChange={(e) =>
                    handleLoanChange('balance', parseFloat(e.target.value))
                  }
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan-interest">Interest Rate (%)</Label>
              <div className="relative">
                <Input
                  id="loan-interest"
                  type="number"
                  placeholder="e.g., 4.5"
                  value={newLoan.interestRate || ''}
                  onChange={(e) =>
                    handleLoanChange('interestRate', parseFloat(e.target.value))
                  }
                  min="0"
                  max="100"
                  step="0.01"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                  %
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loan-term">Term (Years)</Label>
                <Input
                  id="loan-term"
                  type="number"
                  placeholder="e.g., 5"
                  value={newLoan.termYears || ''}
                  onChange={(e) =>
                    handleLoanChange('termYears', parseFloat(e.target.value))
                  }
                  min="0.5"
                  step="0.5"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="loan-payment">Monthly Payment</Label>
                  <button
                    type="button"
                    onClick={calculateLoanPayment}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Calculate
                  </button>
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
                    id="loan-payment"
                    type="number"
                    placeholder="e.g., 200"
                    value={newLoan.minimumPayment || ''}
                    onChange={(e) =>
                      handleLoanChange(
                        'minimumPayment',
                        parseFloat(e.target.value)
                      )
                    }
                    className="pl-8"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingLoan(false)
                if (!newLoan.id) {
                  // Reset form if this was a new loan
                  setNewLoan({
                    name: '',
                    balance: 0,
                    interestRate: 0,
                    termYears: 0,
                    minimumPayment: 0,
                    loanType: LoanType.PERSONAL,
                  })
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLoan}
              disabled={
                !newLoan.name ||
                !newLoan.balance ||
                !newLoan.interestRate ||
                !newLoan.termYears ||
                !newLoan.minimumPayment
              }
            >
              {newLoan.id ? 'Update Loan' : 'Add Loan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
