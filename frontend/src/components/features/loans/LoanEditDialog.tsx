import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { calculateMonthlyPayment } from '@/components/features/wealth-optimizer/calculations'
import { ArrowRightLeft } from 'lucide-react'

interface LoanEditDialogProps {
  loan: Loan
  open: boolean
  onSave: (loan: Loan) => void
  onCancel: () => void
}

const LoanEditDialog: React.FC<LoanEditDialogProps> = ({
  loan,
  open,
  onSave,
  onCancel,
}) => {
  // Create a copy of the loan to work with
  const [loanData, setLoanData] = useState<Loan>({ ...loan })

  // Calculate mode: payment-based or term-based
  const [calculationMode, setCalculationMode] = useState<'payment' | 'term'>(
    loan.minimumPayment > 0 ? 'payment' : 'term'
  )

  // Local state to handle input values during typing
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  // Reset form when loan changes
  useEffect(() => {
    setLoanData({ ...loan })
    setCalculationMode(loan.minimumPayment > 0 ? 'payment' : 'term')
    setInputValues({})
  }, [loan])

  // Calculate monthly payment based on balance, interest rate, and term
  const calculatePayment = (
    balance: number,
    interestRate: number,
    termYears: number
  ) => {
    if (balance <= 0 || termYears <= 0) return 0

    return calculateMonthlyPayment(balance, interestRate, termYears)
  }

  // Calculate loan term based on balance, interest rate, and payment
  const calculateLoanTerm = (
    balance: number,
    interestRate: number,
    payment: number
  ) => {
    if (balance <= 0 || payment <= 0) return 0

    // For zero interest
    if (interestRate === 0) {
      return balance / payment / 12
    }

    const monthlyRate = interestRate / 100 / 12

    // Check if payment covers interest
    if (payment <= balance * monthlyRate) {
      return 99 // Effectively infinity
    }

    const n =
      -Math.log(1 - (balance * monthlyRate) / payment) /
      Math.log(1 + monthlyRate)
    return n / 12 // Convert months to years
  }

  // Update field in loan data
  const updateField = (field: keyof Loan, value: any) => {
    setLoanData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Handle input changes - maintain the raw input while typing
  const handleInputChange = (field: keyof Loan, value: string) => {
    // Store the raw input
    setInputValues({
      ...inputValues,
      [field]: value,
    })

    // For string fields, update directly
    if (field === 'name') {
      updateField(field, value)
      return
    }

    // For numeric fields, validate format
    const cleanedValue = value.replace(',', '.')

    // Allow empty string
    if (cleanedValue === '') {
      return
    }

    // Validate numeric format
    if (!/^-?\d*\.?\d*$/.test(cleanedValue)) {
      return // Invalid format
    }

    const numValue = parseFloat(cleanedValue)
    if (!isNaN(numValue)) {
      updateField(field, numValue)

      // If we're changing balance, interest rate, or term in term mode,
      // recalculate the payment
      if (
        calculationMode === 'term' &&
        (field === 'balance' ||
          field === 'interestRate' ||
          field === 'termYears')
      ) {
        const payment = calculatePayment(
          field === 'balance' ? numValue : loanData.balance,
          field === 'interestRate' ? numValue : loanData.interestRate,
          field === 'termYears' ? numValue : loanData.termYears
        )
        updateField('minimumPayment', Math.ceil(payment * 100) / 100)
      }

      // If we're changing balance, interest rate, or payment in payment mode,
      // recalculate the term
      if (
        calculationMode === 'payment' &&
        (field === 'balance' ||
          field === 'interestRate' ||
          field === 'minimumPayment')
      ) {
        const term = calculateLoanTerm(
          field === 'balance' ? numValue : loanData.balance,
          field === 'interestRate' ? numValue : loanData.interestRate,
          field === 'minimumPayment' ? numValue : loanData.minimumPayment
        )
        updateField('termYears', Math.ceil(term * 100) / 100)
      }
    }
  }

  // Handle input blur - finalize the value
  const handleInputBlur = (field: keyof Loan) => {
    // Clear temporary input value
    setInputValues({
      ...inputValues,
      [field]: undefined,
    })

    // If empty, set to 0 for numeric fields
    if (inputValues[field] === '' && field !== 'name') {
      updateField(field, 0)
    }
  }

  // Toggle calculation mode
  const toggleCalculationMode = () => {
    const newMode = calculationMode === 'payment' ? 'term' : 'payment'
    setCalculationMode(newMode)

    // Recalculate based on new mode
    if (newMode === 'term') {
      if (loanData.balance > 0 && loanData.termYears > 0) {
        const payment = calculatePayment(
          loanData.balance,
          loanData.interestRate,
          loanData.termYears
        )
        updateField('minimumPayment', Math.ceil(payment * 100) / 100)
      }
    } else {
      if (loanData.balance > 0 && loanData.minimumPayment > 0) {
        const term = calculateLoanTerm(
          loanData.balance,
          loanData.interestRate,
          loanData.minimumPayment
        )
        updateField('termYears', Math.ceil(term * 100) / 100)
      }
    }
  }

  // Get the display value for inputs
  const getDisplayValue = (field: keyof Loan) => {
    // If there's an input value being typed, show that
    if (inputValues[field] !== undefined) {
      return inputValues[field]
    }

    // Otherwise show the actual value
    const value = loanData[field]
    if (typeof value === 'number') {
      if (value === 0) return ''
      return value.toString()
    }
    return value
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!loanData.name) {
      // Could show an error, but for simplicity we'll use a default name
      loanData.name = `Loan ${loanData.id}`
    }

    // Ensure numeric fields are not negative
    const finalLoan = {
      ...loanData,
      balance: Math.max(0, loanData.balance),
      interestRate: Math.max(0, loanData.interestRate),
      termYears: Math.max(0, loanData.termYears),
      minimumPayment: Math.max(0, loanData.minimumPayment),
    }

    onSave(finalLoan)
  }

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Loan</DialogTitle>
            <DialogDescription>
              Update the details for this loan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Loan Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Loan Name
              </Label>
              <Input
                id="name"
                value={getDisplayValue('name')}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleInputBlur('name')}
                className="col-span-3"
              />
            </div>

            {/* Loan Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Loan Type
              </Label>
              <Select
                value={loanData.loanType || LoanType.PERSONAL}
                onValueChange={(value) =>
                  updateField('loanType', value as LoanType)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LoanType.MORTGAGE}>Mortgage</SelectItem>
                  <SelectItem value={LoanType.STUDENT}>Student Loan</SelectItem>
                  <SelectItem value={LoanType.AUTO}>Auto Loan</SelectItem>
                  <SelectItem value={LoanType.CREDIT_CARD}>
                    Credit Card
                  </SelectItem>
                  <SelectItem value={LoanType.PERSONAL}>
                    Personal Loan
                  </SelectItem>
                  <SelectItem value={LoanType.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Balance */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right">
                Current Balance
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  $
                </span>
                <Input
                  id="balance"
                  value={getDisplayValue('balance')}
                  onChange={(e) => handleInputChange('balance', e.target.value)}
                  onBlur={() => handleInputBlur('balance')}
                  className="pl-7"
                  type="text"
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interestRate" className="text-right">
                Interest Rate
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="interestRate"
                  value={getDisplayValue('interestRate')}
                  onChange={(e) =>
                    handleInputChange('interestRate', e.target.value)
                  }
                  onBlur={() => handleInputBlur('interestRate')}
                  className="pr-7"
                  type="text"
                  inputMode="decimal"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                  %
                </span>
              </div>
            </div>

            {/* Term */}
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="flex justify-end items-center gap-1 text-right">
                <Label htmlFor="termYears">Term</Label>
                {calculationMode === 'payment' && (
                  <span className="text-xs text-blue-600">(Calculated)</span>
                )}
              </div>
              <div className="col-span-3 relative">
                <Input
                  id="termYears"
                  value={getDisplayValue('termYears')}
                  onChange={(e) =>
                    handleInputChange('termYears', e.target.value)
                  }
                  onBlur={() => handleInputBlur('termYears')}
                  className="pr-12"
                  disabled={calculationMode === 'payment'}
                  type="text"
                  inputMode="decimal"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                  Years
                </span>
              </div>
            </div>

            {/* Minimum Payment */}
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="flex justify-end items-center gap-1 text-right">
                <Label htmlFor="minimumPayment">Monthly Payment</Label>
                {calculationMode === 'term' && (
                  <span className="text-xs text-blue-600">(Calculated)</span>
                )}
              </div>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  $
                </span>
                <Input
                  id="minimumPayment"
                  value={getDisplayValue('minimumPayment')}
                  onChange={(e) =>
                    handleInputChange('minimumPayment', e.target.value)
                  }
                  onBlur={() => handleInputBlur('minimumPayment')}
                  className="pl-7"
                  disabled={calculationMode === 'term'}
                  type="text"
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Switch calculation mode */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleCalculationMode}
                className="flex items-center gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Switch to {calculationMode === 'payment'
                  ? 'term'
                  : 'payment'}{' '}
                input
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
