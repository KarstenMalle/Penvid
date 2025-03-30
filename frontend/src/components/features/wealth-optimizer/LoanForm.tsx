import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loan } from '@/components/features/wealth-optimizer/types'
import { ArrowRightLeft } from 'lucide-react'

interface LoanFormProps {
  loans: Loan[]
  onAddLoan: () => void
  onRemoveLoan: (id: number) => void
  onUpdateLoan: (id: number, field: keyof Loan, value: string | number) => void
  showCalculatedPayment?: boolean
  monthlyAvailable?: number
}

/**
 * A reusable component for adding and editing loan information.
 * Can be used across different financial tools in the app.
 */
const LoanForm: React.FC<LoanFormProps> = ({
  loans,
  onAddLoan,
  onRemoveLoan,
  onUpdateLoan,
  showCalculatedPayment = true,
  monthlyAvailable = 0,
}) => {
  // Track which input mode is used for each loan (payment-based or term-based)
  const [calculationModes, setCalculationModes] = useState<
    Record<number, 'payment' | 'term'>
  >({})
  const [totalMinimumPayment, setTotalMinimumPayment] = useState(0)

  // Set default calculation mode for new loans
  useEffect(() => {
    const newModes = { ...calculationModes }
    loans.forEach((loan) => {
      if (!newModes[loan.id]) {
        newModes[loan.id] = 'payment'
      }
    })
    setCalculationModes(newModes)
  }, [loans])

  // Calculate total minimum payments whenever loans change
  useEffect(() => {
    const total = loans.reduce((sum, loan) => sum + loan.minimumPayment, 0)
    setTotalMinimumPayment(total)
  }, [loans])

  // Calculate payment needed to pay off a loan in a given number of years
  const calculateMonthlyPayment = (
    principal: number,
    annualRate: number,
    years: number
  ): number => {
    if (principal <= 0 || years <= 0) return 0

    const monthlyRate = annualRate / 100 / 12
    const numPayments = years * 12

    if (monthlyRate === 0) return principal / numPayments

    return (
      (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    )
  }

  // Calculate how long it will take to pay off a loan with a given payment
  const calculateLoanTerm = (
    principal: number,
    annualRate: number,
    monthlyPayment: number
  ): number => {
    if (principal <= 0 || monthlyPayment <= 0) return 0

    const monthlyRate = annualRate / 100 / 12

    // If interest rate is 0, simple division
    if (monthlyRate === 0) {
      return principal / monthlyPayment / 12
    }

    // For interest-bearing loans:
    // n = -log(1 - P*r/PMT) / log(1 + r)
    // where n is number of payments, P is principal, r is monthly rate, PMT is payment
    const monthlyRateTimesLoan = principal * monthlyRate

    // Check if monthly payment is sufficient to cover interest
    if (monthlyPayment <= monthlyRateTimesLoan) {
      return 99 // Effectively infinity - payment doesn't cover interest
    }

    const n =
      -Math.log(1 - monthlyRateTimesLoan / monthlyPayment) /
      Math.log(1 + monthlyRate)
    return n / 12 // Convert months to years
  }

  // Handle empty input fields properly
  const handleInputChange = (id: number, field: keyof Loan, value: string) => {
    // If the field is name, pass the string value directly
    if (field === 'name') {
      onUpdateLoan(id, field, value)
      return
    }

    // For numeric fields, handle empty string specially
    if (value === '') {
      onUpdateLoan(id, field, 0)
      return
    }

    // For numeric fields with value, convert to number
    const numValue = parseFloat(value)

    if (isNaN(numValue)) {
      onUpdateLoan(id, field, 0)
      return
    }

    // If we're changing balance, interest rate, or term, we may need to recalculate payment
    const loan = loans.find((l) => l.id === id)
    if (!loan) return

    // Update the direct field first
    onUpdateLoan(id, field, numValue)

    // Handle calculations based on mode
    if (calculationModes[id] === 'payment') {
      // In payment mode, if changing balance or interest, update the term
      if (field === 'balance' || field === 'interestRate') {
        const newBalance = field === 'balance' ? numValue : loan.balance
        const newInterestRate =
          field === 'interestRate' ? numValue : loan.interestRate

        if (newBalance > 0 && loan.minimumPayment > 0) {
          const calculatedTerm = calculateLoanTerm(
            newBalance,
            newInterestRate,
            loan.minimumPayment
          )
          onUpdateLoan(
            id,
            'termYears',
            Math.min(Math.max(calculatedTerm, 0.1), 30)
          )
        }
      }
    } else {
      // In term mode, if changing balance, interest, or term, update the payment
      if (
        field === 'balance' ||
        field === 'interestRate' ||
        field === 'termYears'
      ) {
        const newBalance = field === 'balance' ? numValue : loan.balance
        const newInterestRate =
          field === 'interestRate' ? numValue : loan.interestRate
        const newTermYears = field === 'termYears' ? numValue : loan.termYears

        if (newBalance > 0 && newTermYears > 0) {
          const calculatedPayment = calculateMonthlyPayment(
            newBalance,
            newInterestRate,
            newTermYears
          )
          onUpdateLoan(
            id,
            'minimumPayment',
            Math.ceil(calculatedPayment * 100) / 100
          ) // Round up to nearest cent
        }
      }
    }
  }

  // Toggle calculation mode for a loan
  const toggleCalculationMode = (id: number) => {
    const loan = loans.find((l) => l.id === id)
    if (!loan) return

    const newMode = calculationModes[id] === 'payment' ? 'term' : 'payment'
    setCalculationModes({ ...calculationModes, [id]: newMode })

    // Recalculate based on new mode
    if (newMode === 'payment') {
      // Switch to payment mode - term becomes calculated
      const calculatedTerm = calculateLoanTerm(
        loan.balance,
        loan.interestRate,
        loan.minimumPayment
      )
      onUpdateLoan(id, 'termYears', Math.min(Math.max(calculatedTerm, 0.1), 30))
    } else {
      // Switch to term mode - payment becomes calculated
      const calculatedPayment = calculateMonthlyPayment(
        loan.balance,
        loan.interestRate,
        loan.termYears
      )
      onUpdateLoan(
        id,
        'minimumPayment',
        Math.ceil(calculatedPayment * 100) / 100
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Your Loans</h3>
          {monthlyAvailable > 0 && (
            <p className="text-sm text-gray-500">
              Total Minimum Payment: ${totalMinimumPayment.toFixed(2)}/month •
              Extra Available: $
              {Math.max(0, monthlyAvailable - totalMinimumPayment).toFixed(2)}
              /month
            </p>
          )}
        </div>
        <Button onClick={onAddLoan} variant="outline" size="sm">
          + Add Loan
        </Button>
      </div>

      {loans.length > 0 ? (
        <div className="space-y-6">
          {loans.map((loan) => (
            <Card key={loan.id} className="p-4 relative">
              <Button
                variant="ghost"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={() => onRemoveLoan(loan.id)}
              >
                ✕
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2">
                  <Label htmlFor={`loan-name-${loan.id}`}>Loan Name</Label>
                  <Input
                    id={`loan-name-${loan.id}`}
                    value={loan.name}
                    onChange={(e) =>
                      handleInputChange(loan.id, 'name', e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor={`loan-balance-${loan.id}`}>Balance ($)</Label>
                  <Input
                    id={`loan-balance-${loan.id}`}
                    type="number"
                    min="0"
                    value={loan.balance || ''}
                    onChange={(e) =>
                      handleInputChange(loan.id, 'balance', e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor={`loan-interest-${loan.id}`}>
                    Interest Rate (%)
                  </Label>
                  <Input
                    id={`loan-interest-${loan.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={loan.interestRate || ''}
                    onChange={(e) =>
                      handleInputChange(loan.id, 'interestRate', e.target.value)
                    }
                  />
                </div>

                <div className="relative">
                  <div className="flex justify-between">
                    <Label htmlFor={`loan-term-${loan.id}`}>Term (Years)</Label>
                    {calculationModes[loan.id] === 'payment' && (
                      <span className="text-xs text-blue-600">
                        (Calculated)
                      </span>
                    )}
                  </div>
                  <Input
                    id={`loan-term-${loan.id}`}
                    type="number"
                    min="0.1"
                    step="0.1"
                    max="30"
                    value={loan.termYears?.toFixed(1) || ''}
                    onChange={(e) =>
                      handleInputChange(loan.id, 'termYears', e.target.value)
                    }
                    disabled={calculationModes[loan.id] === 'payment'}
                    className={
                      calculationModes[loan.id] === 'payment'
                        ? 'bg-gray-50'
                        : ''
                    }
                  />
                </div>

                <div className="relative">
                  <div className="flex justify-between">
                    <Label
                      htmlFor={`loan-payment-${loan.id}`}
                      className="whitespace-nowrap text-sm"
                    >
                      Min Payment ($)
                    </Label>
                    {calculationModes[loan.id] === 'term' && (
                      <span className="text-xs text-blue-600">
                        (Calculated)
                      </span>
                    )}
                  </div>
                  <Input
                    id={`loan-payment-${loan.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={loan.minimumPayment?.toFixed(2) || ''}
                    onChange={(e) =>
                      handleInputChange(
                        loan.id,
                        'minimumPayment',
                        e.target.value
                      )
                    }
                    disabled={calculationModes[loan.id] === 'term'}
                    className={
                      calculationModes[loan.id] === 'term' ? 'bg-gray-50' : ''
                    }
                  />
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => toggleCalculationMode(loan.id)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Switch to{' '}
                {calculationModes[loan.id] === 'payment'
                  ? 'term'
                  : 'payment'}{' '}
                input
              </Button>

              {showCalculatedPayment &&
                calculationModes[loan.id] === 'term' && (
                  <div className="mt-4 text-sm">
                    <p>
                      <span className="font-medium">
                        Calculated Monthly Payment:{' '}
                      </span>
                      ${loan.minimumPayment.toFixed(2)}/month
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      This is the minimum payment required to pay off this loan
                      in {loan.termYears} years at {loan.interestRate}%
                      interest.
                    </p>
                  </div>
                )}

              {showCalculatedPayment &&
                calculationModes[loan.id] === 'payment' && (
                  <div className="mt-4 text-sm">
                    <p>
                      <span className="font-medium">
                        Calculated Payoff Term:{' '}
                      </span>
                      {loan.termYears.toFixed(1)} years
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      This is how long it will take to pay off this loan making
                      ${loan.minimumPayment.toFixed(2)}/month payments at{' '}
                      {loan.interestRate}% interest.
                    </p>

                    {loan.minimumPayment * 12 * loan.termYears - loan.balance >
                      0 && (
                      <p className="text-amber-600 text-xs mt-1">
                        Total interest paid will be approximately $
                        {(
                          loan.minimumPayment * 12 * loan.termYears -
                          loan.balance
                        ).toFixed(2)}
                        .
                      </p>
                    )}
                  </div>
                )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 border border-dashed rounded-lg">
          <p className="text-gray-500">
            No loans added yet. Click "Add Loan" to begin.
          </p>
        </div>
      )}
    </div>
  )
}

export default LoanForm
