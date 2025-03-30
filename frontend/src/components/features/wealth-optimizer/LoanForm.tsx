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

  // Local state to handle input values during typing
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

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

  // Function to get the input value for displaying in the input field
  const getDisplayValue = (loan: Loan, field: keyof Loan) => {
    const inputKey = `${loan.id}-${field}`

    // If there's a temporary input value during typing, use that
    if (inputValues[inputKey] !== undefined) {
      return inputValues[inputKey]
    }

    // Otherwise use the actual loan value
    const value = loan[field]
    if (typeof value === 'number') {
      if (value === 0) return ''
      // For interest rate and term, show 2 decimal places
      if (field === 'interestRate' || field === 'termYears') {
        return value.toFixed(2)
      }
      // For monetary values, show 2 decimal places
      return value.toString()
    }
    return value
  }

  // Handle input changes for loan fields - capture and display what user is typing
  const handleInputChange = (id: number, field: keyof Loan, value: string) => {
    const inputKey = `${id}-${field}`

    // Store raw input value for display during typing
    setInputValues({
      ...inputValues,
      [inputKey]: value,
    })

    // If the field is name, pass the string value directly
    if (field === 'name') {
      onUpdateLoan(id, field, value)
      return
    }

    // For numeric fields, validate format
    // Allow digits, one decimal point, and handle both comma and period as decimal separators
    const cleanedValue = value.replace(',', '.')

    // Don't validate empty strings - allow them for clearing fields
    if (cleanedValue === '') {
      return
    }

    // Basic validation for numeric format
    if (!/^-?\d*\.?\d*$/.test(cleanedValue)) {
      return // Invalid format, don't update
    }

    // Valid number format, convert to number
    const numValue = parseFloat(cleanedValue)
    if (!isNaN(numValue)) {
      onUpdateLoan(id, field, numValue)
    }
  }

  // Handle when an input field loses focus - finalize the value and trigger calculations
  const handleInputBlur = (id: number, field: keyof Loan) => {
    const inputKey = `${id}-${field}`
    const loan = loans.find((l) => l.id === id)
    if (!loan) return

    // Clear temporary input display value
    setInputValues({
      ...inputValues,
      [inputKey]: undefined,
    })

    // If empty value on blur, set to 0
    if (inputValues[inputKey] === '') {
      onUpdateLoan(id, field, 0)
    }

    // Recalculate dependent fields based on calculation mode
    if (field !== 'name') {
      if (calculationModes[id] === 'payment') {
        // In payment mode, update the term if we have enough info
        if (loan.balance > 0 && loan.minimumPayment > 0) {
          const calculatedTerm = calculateLoanTerm(
            loan.balance,
            loan.interestRate,
            loan.minimumPayment
          )
          if (isFinite(calculatedTerm) && calculatedTerm > 0) {
            onUpdateLoan(
              id,
              'termYears',
              Math.min(Math.max(calculatedTerm, 0.1), 30)
            )
          }
        }
      } else {
        // In term mode, update the payment if we have enough info
        if (loan.balance > 0 && loan.termYears > 0) {
          const calculatedPayment = calculateMonthlyPayment(
            loan.balance,
            loan.interestRate,
            loan.termYears
          )
          if (calculatedPayment > 0) {
            onUpdateLoan(
              id,
              'minimumPayment',
              Math.ceil(calculatedPayment * 100) / 100
            )
          }
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
      // Switch to payment mode - term becomes calculated based on minimum payment
      if (loan.balance > 0 && loan.minimumPayment > 0) {
        const calculatedTerm = calculateLoanTerm(
          loan.balance,
          loan.interestRate,
          loan.minimumPayment
        )

        // Only update if we got a valid result
        if (isFinite(calculatedTerm) && calculatedTerm > 0) {
          onUpdateLoan(
            id,
            'termYears',
            Math.min(Math.max(calculatedTerm, 0.1), 30)
          )
        }
      }
    } else {
      // Switch to term mode - payment becomes calculated based on term
      if (loan.balance > 0 && loan.termYears > 0) {
        const calculatedPayment = calculateMonthlyPayment(
          loan.balance,
          loan.interestRate,
          loan.termYears
        )

        // Only update if we got a valid result
        if (calculatedPayment > 0) {
          onUpdateLoan(
            id,
            'minimumPayment',
            Math.ceil(calculatedPayment * 100) / 100
          )
        }
      }
    }
  }

  // Calculate total interest paid over the life of a loan
  const calculateTotalInterest = (
    principal: number,
    monthlyPayment: number,
    interestRate: number
  ) => {
    if (principal <= 0 || monthlyPayment <= 0 || interestRate <= 0) return 0

    const monthlyRate = interestRate / 100 / 12

    // Check if payment covers interest
    if (monthlyPayment <= principal * monthlyRate) {
      return Infinity // Payment doesn't cover interest
    }

    let balance = principal
    let totalInterest = 0
    let months = 0
    const MAX_MONTHS = 1200 // 100 years cap

    while (balance > 0.01 && months < MAX_MONTHS) {
      const interestAmount = balance * monthlyRate
      totalInterest += interestAmount

      const principalPayment = Math.min(
        monthlyPayment,
        balance + interestAmount
      )
      balance = balance - (principalPayment - interestAmount)
      months++

      // Extra safety check
      if (balance < 0) balance = 0
    }

    return Math.round(totalInterest * 100) / 100
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
                aria-label="Remove loan"
              >
                ✕
              </Button>

              {/* Loan Name - Placed prominently at the top, full width */}
              <div className="mb-4">
                <Label htmlFor={`loan-name-${loan.id}`}>Loan Name</Label>
                <Input
                  id={`loan-name-${loan.id}`}
                  value={loan.name}
                  onChange={(e) =>
                    handleInputChange(loan.id, 'name', e.target.value)
                  }
                  onBlur={() => handleInputBlur(loan.id, 'name')}
                />
              </div>

              {/* Other loan details in a grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`loan-balance-${loan.id}`}>Balance ($)</Label>
                  <Input
                    id={`loan-balance-${loan.id}`}
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue(loan, 'balance')}
                    onChange={(e) =>
                      handleInputChange(loan.id, 'balance', e.target.value)
                    }
                    onBlur={() => handleInputBlur(loan.id, 'balance')}
                    onFocus={(e) => e.target.select()}
                  />
                </div>

                <div>
                  <Label htmlFor={`loan-interest-${loan.id}`}>
                    Interest Rate (%)
                  </Label>
                  <Input
                    id={`loan-interest-${loan.id}`}
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue(loan, 'interestRate')}
                    onChange={(e) =>
                      handleInputChange(loan.id, 'interestRate', e.target.value)
                    }
                    onBlur={() => handleInputBlur(loan.id, 'interestRate')}
                    onFocus={(e) => e.target.select()}
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
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue(loan, 'termYears')}
                    onChange={(e) =>
                      handleInputChange(loan.id, 'termYears', e.target.value)
                    }
                    onBlur={() => handleInputBlur(loan.id, 'termYears')}
                    onFocus={(e) => e.target.select()}
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
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue(loan, 'minimumPayment')}
                    onChange={(e) =>
                      handleInputChange(
                        loan.id,
                        'minimumPayment',
                        e.target.value
                      )
                    }
                    onBlur={() => handleInputBlur(loan.id, 'minimumPayment')}
                    onFocus={(e) => e.target.select()}
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
                className="mt-4"
                onClick={() => toggleCalculationMode(loan.id)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Switch to{' '}
                {calculationModes[loan.id] === 'payment'
                  ? 'term'
                  : 'payment'}{' '}
                input
              </Button>

              {showCalculatedPayment && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm">
                  {calculationModes[loan.id] === 'term' && (
                    <>
                      <p>
                        <span className="font-medium">
                          Calculated Monthly Payment:{' '}
                        </span>
                        ${loan.minimumPayment.toFixed(2)}/month
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        This is the minimum payment required to pay off this
                        loan in {loan.termYears.toFixed(2)} years at{' '}
                        {loan.interestRate.toFixed(2)}% interest.
                      </p>
                    </>
                  )}

                  {calculationModes[loan.id] === 'payment' && (
                    <>
                      <p>
                        <span className="font-medium">
                          Calculated Payoff Term:{' '}
                        </span>
                        {loan.termYears.toFixed(2)} years
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        This is how long it will take to pay off this loan
                        making ${loan.minimumPayment.toFixed(2)}/month payments
                        at {loan.interestRate.toFixed(2)}% interest.
                      </p>
                    </>
                  )}

                  {loan.balance > 0 &&
                    loan.interestRate > 0 &&
                    loan.minimumPayment > 0 && (
                      <p className="text-amber-600 text-xs mt-2">
                        Total interest paid will be approximately $
                        {calculateTotalInterest(
                          loan.balance,
                          loan.minimumPayment,
                          loan.interestRate
                        ).toLocaleString()}
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
