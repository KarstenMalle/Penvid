import React, { useState } from 'react'
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
import { Loan } from './types'
import {
  calculateMonthlyPayment,
  formatCurrency,
  formatTimeSpan,
} from './calculations'
import { Progress } from '@/components/ui/progress'

interface MonthlyProgressTrackerProps {
  loans: Loan[]
  onUpdateLoan: (updatedLoan: Loan) => void
  monthlyBudget: number
  onUpdateMonthlyBudget: (amount: number) => void
  paymentHistory: PaymentRecord[]
  onAddPayment: (payment: PaymentRecord) => void
}

export interface PaymentRecord {
  id: string
  date: string
  loanId: number
  amount: number
  isExtraPayment: boolean
}

const MonthlyProgressTracker: React.FC<MonthlyProgressTrackerProps> = ({
  loans,
  onUpdateLoan,
  monthlyBudget,
  onUpdateMonthlyBudget,
  paymentHistory,
  onAddPayment,
}) => {
  const [extraPayments, setExtraPayments] = useState<Record<number, number>>({})
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )

  // Calculate total minimum payments
  const totalMinimumPayments = loans.reduce(
    (sum, loan) => sum + loan.minimumPayment,
    0
  )

  // Calculate remaining budget after minimum payments
  const remainingBudget = Math.max(0, monthlyBudget - totalMinimumPayments)

  // Handle extra payment input change
  const handleExtraPaymentChange = (loanId: number, value: string) => {
    const amount = value === '' ? 0 : parseFloat(value)
    setExtraPayments({
      ...extraPayments,
      [loanId]: isNaN(amount) ? 0 : amount,
    })
  }

  // Calculate total extra payments
  const totalExtraPayments = Object.values(extraPayments).reduce(
    (sum, amount) => sum + amount,
    0
  )

  // Calculate total payments (minimum + extra)
  const totalPayments = totalMinimumPayments + totalExtraPayments

  // Check if exceeding budget
  const isExceedingBudget = totalPayments > monthlyBudget

  // Handle monthly budget change
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      onUpdateMonthlyBudget(0)
    } else {
      const amount = parseFloat(value)
      onUpdateMonthlyBudget(isNaN(amount) ? 0 : amount)
    }
  }

  // Handle form submission for recording payments
  const handleRecordPayments = () => {
    // Record minimum payments
    loans.forEach((loan) => {
      if (loan.minimumPayment > 0) {
        const paymentRecord: PaymentRecord = {
          id: `${Date.now()}-${loan.id}-min`,
          date: paymentDate,
          loanId: loan.id,
          amount: loan.minimumPayment,
          isExtraPayment: false,
        }
        onAddPayment(paymentRecord)
      }
    })

    // Record extra payments
    Object.entries(extraPayments).forEach(([loanId, amount]) => {
      if (amount > 0) {
        const paymentRecord: PaymentRecord = {
          id: `${Date.now()}-${loanId}-extra`,
          date: paymentDate,
          loanId: parseInt(loanId),
          amount: amount,
          isExtraPayment: true,
        }
        onAddPayment(paymentRecord)
      }
    })

    // Update loan balances
    loans.forEach((loan) => {
      const extraPayment = extraPayments[loan.id] || 0
      const newBalance = Math.max(
        0,
        loan.balance - loan.minimumPayment - extraPayment
      )

      if (newBalance !== loan.balance) {
        onUpdateLoan({
          ...loan,
          balance: newBalance,
        })
      }
    })

    // Reset form
    setExtraPayments({})
    setShowPaymentForm(false)
  }

  // Calculate progress for each loan
  const calculateLoanProgress = (loan: Loan) => {
    // Get original loan amount (estimate from current balance and payment history if not available)
    const loanPayments = paymentHistory.filter((p) => p.loanId === loan.id)
    const totalPaid = loanPayments.reduce((sum, p) => sum + p.amount, 0)
    const originalAmount = loan.balance + totalPaid

    // Calculate progress percentage
    const progress = Math.min(
      100,
      Math.max(0, ((originalAmount - loan.balance) / originalAmount) * 100)
    )

    return {
      progress,
      originalAmount,
      amountPaid: originalAmount - loan.balance,
    }
  }

  // Calculate estimated payoff date for each loan
  const calculatePayoffDate = (loan: Loan) => {
    // Skip if no balance
    if (loan.balance <= 0) return 'Paid off'

    // Get extra payment for this loan
    const extraPayment = extraPayments[loan.id] || 0
    const totalMonthlyPayment = loan.minimumPayment + extraPayment

    // Calculate months to payoff
    const monthlyRate = loan.interestRate / 100 / 12
    let remainingBalance = loan.balance
    let months = 0

    // Simple simulation to account for interest
    while (remainingBalance > 0 && months < 1200) {
      // 100 years max
      const interestForMonth = remainingBalance * monthlyRate
      remainingBalance =
        remainingBalance + interestForMonth - totalMonthlyPayment
      months++
    }

    // Calculate payoff date
    const payoffDate = new Date()
    payoffDate.setMonth(payoffDate.getMonth() + months)

    return payoffDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payment Tracker</CardTitle>
          <CardDescription>
            Track your monthly payments and see your progress toward debt
            freedom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monthly Budget Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="monthlyBudget">
                Monthly Debt Repayment Budget
              </Label>
              <div className="w-1/3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <Input
                    id="monthlyBudget"
                    type="number"
                    min="0"
                    className="pl-7"
                    value={monthlyBudget || ''}
                    onChange={handleBudgetChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span>Minimum required payments:</span>
              <span className="font-medium">
                {formatCurrency(totalMinimumPayments)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Available for extra payments:</span>
              <span
                className={`font-medium ${remainingBudget > 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(remainingBudget)}
              </span>
            </div>
          </div>

          {/* Loan Progress Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Loan Progress</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaymentForm(!showPaymentForm)}
              >
                {showPaymentForm ? 'Cancel' : "Record This Month's Payments"}
              </Button>
            </div>

            {/* Loan Progress Cards */}
            <div className="space-y-4">
              {loans.map((loan) => {
                const progress = calculateLoanProgress(loan)
                return (
                  <Card key={loan.id} className="overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 flex justify-between">
                      <h4 className="font-medium">{loan.name}</h4>
                      <span>{formatCurrency(loan.balance)} remaining</span>
                    </div>

                    <CardContent className="pt-4">
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Loan Progress</span>
                          <span>{progress.progress.toFixed(0)}% Complete</span>
                        </div>
                        <Progress value={progress.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            Original: {formatCurrency(progress.originalAmount)}
                          </span>
                          <span>
                            Paid: {formatCurrency(progress.amountPaid)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Interest Rate</p>
                          <p className="font-medium">{loan.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Minimum Payment</p>
                          <p className="font-medium">
                            {formatCurrency(loan.minimumPayment)}/month
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Estimated Payoff Date</p>
                          <p className="font-medium">
                            {calculatePayoffDate(loan)}
                          </p>
                        </div>
                      </div>

                      {/* Payment Form */}
                      {showPaymentForm && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label
                                htmlFor={`min-payment-${loan.id}`}
                                className="text-xs"
                              >
                                Minimum Payment
                              </Label>
                              <Input
                                id={`min-payment-${loan.id}`}
                                type="number"
                                value={loan.minimumPayment}
                                disabled
                                className="mt-1 bg-gray-100"
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor={`extra-payment-${loan.id}`}
                                className="text-xs"
                              >
                                Extra Payment
                              </Label>
                              <div className="relative mt-1">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                  $
                                </span>
                                <Input
                                  id={`extra-payment-${loan.id}`}
                                  type="number"
                                  min="0"
                                  className="pl-7"
                                  value={extraPayments[loan.id] || ''}
                                  onChange={(e) =>
                                    handleExtraPaymentChange(
                                      loan.id,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Payment Recording UI */}
            {showPaymentForm && (
              <Card className="border-t-4 border-t-blue-500">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <Label htmlFor="payment-date">Payment Date</Label>
                        <Input
                          id="payment-date"
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-40"
                        />
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Payments</p>
                        <p
                          className={`text-xl font-bold ${isExceedingBudget ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {formatCurrency(totalPayments)}
                        </p>
                        {isExceedingBudget && (
                          <p className="text-xs text-red-600">
                            Exceeds your budget by{' '}
                            {formatCurrency(totalPayments - monthlyBudget)}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button className="w-full" onClick={handleRecordPayments}>
                      Record Payments & Update Balances
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Payment History */}
          {paymentHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Recent Payments</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Loan</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-right p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      )
                      .slice(0, 5) // Show last 5 payments
                      .map((payment) => {
                        const loan = loans.find((l) => l.id === payment.loanId)
                        return (
                          <tr key={payment.id} className="border-t">
                            <td className="p-3">
                              {new Date(payment.date).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              {loan?.name || `Loan ${payment.loanId}`}
                            </td>
                            <td className="p-3">
                              {payment.isExtraPayment ? (
                                <span className="text-green-600 font-medium">
                                  Extra Payment
                                </span>
                              ) : (
                                <span>Regular Payment</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {formatCurrency(payment.amount)}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MonthlyProgressTracker
