// frontend/src/components/features/loans/LoanEditDialog.tsx

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRightLeft } from 'lucide-react'
import { useLocalization } from '@/context/LocalizationContext'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'

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
  const { t, currency, convertAmount } = useLocalization()

  // Track both display values (in current currency) and base values (in USD)
  const [displayLoan, setDisplayLoan] = useState<Loan>({ ...loan })
  const [baseLoan, setBaseLoan] = useState<Loan>({ ...loan })

  const [isCalculationMode, setIsCalculationMode] = useState<
    'payment' | 'term'
  >(
    loan.termYears > 0 && (!loan.minimumPayment || loan.minimumPayment <= 0)
      ? 'term'
      : 'payment'
  )
  const [isCalculating, setIsCalculating] = useState(false)

  // Initialize the form with the loan data, converting values if necessary
  useEffect(() => {
    if (currency === 'USD') {
      // If we're in USD, no conversion needed
      setDisplayLoan({ ...loan })
      setBaseLoan({ ...loan })
    } else {
      // If in a different currency, convert monetary values for display
      const displayBalance =
        loan.balance > 0 ? convertAmount(loan.balance, 'USD', currency) : 0

      const displayPayment =
        loan.minimumPayment > 0
          ? convertAmount(loan.minimumPayment, 'USD', currency)
          : 0

      // Set display values with conversion
      setDisplayLoan({
        ...loan,
        balance: displayBalance,
        minimumPayment: displayPayment,
      })

      // Keep original USD values
      setBaseLoan({ ...loan })
    }

    // Set calculation mode based on loan values
    setIsCalculationMode(
      loan.termYears > 0 && (!loan.minimumPayment || loan.minimumPayment <= 0)
        ? 'term'
        : 'payment'
    )
  }, [loan, currency, convertAmount])

  // Input validation - check if required fields are filled
  const canProceedToCalculation = () => {
    const hasName = displayLoan.name && displayLoan.name.trim() !== ''
    const hasLoanType = !!displayLoan.loanType
    const hasBalance = displayLoan.balance > 0
    const hasRate = displayLoan.interestRate >= 0

    if (isCalculationMode === 'term') {
      // When calculating payment, need balance, rate and term
      return (
        hasName &&
        hasLoanType &&
        hasBalance &&
        hasRate &&
        displayLoan.termYears > 0
      )
    } else {
      // When calculating term, need balance, rate and payment
      return (
        hasName &&
        hasLoanType &&
        hasBalance &&
        hasRate &&
        displayLoan.minimumPayment > 0
      )
    }
  }

  // Calculate monthly payment based on balance, interest rate, and term
  const calculatePayment = () => {
    const principal = displayLoan.balance
    const years = displayLoan.termYears
    const rate = displayLoan.interestRate

    // Convert annual rate to monthly decimal
    const monthlyRate = rate / 12 / 100
    const numPayments = years * 12

    let payment

    // Special case for 0% loans
    if (monthlyRate === 0 || rate === 0) {
      payment = principal / numPayments
    } else {
      // Use standard loan payment formula: PMT = P × r × (1 + r)^n / ((1 + r)^n - 1)
      payment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
    }

    return parseFloat(payment.toFixed(2))
  }

  // Calculate loan term based on balance, interest rate, and payment
  const calculateTerm = () => {
    const principal = displayLoan.balance
    const payment = displayLoan.minimumPayment
    const rate = displayLoan.interestRate

    // Convert annual rate to monthly decimal
    const monthlyRate = rate / 12 / 100

    let termMonths

    // Special case for 0% loans
    if (monthlyRate === 0 || rate === 0) {
      termMonths = principal / payment
    } else {
      // If payment is too small to cover interest
      if (payment <= principal * monthlyRate) {
        termMonths = 1200 // Cap at 100 years (effectively infinity)
      } else {
        // Use standard formula: n = -log(1 - (P×r)/PMT) / log(1+r)
        termMonths =
          -Math.log(1 - (principal * monthlyRate) / payment) /
          Math.log(1 + monthlyRate)
      }
    }

    const termYears = termMonths / 12
    return parseFloat(termYears.toFixed(2))
  }

  // Handle input changes with direct string manipulation
  const handleChange = (
    field: keyof Loan,
    value: string | number | LoanType
  ) => {
    // For monetary fields, don't auto-parse to number to allow better input control
    if (field === 'balance' || field === 'minimumPayment') {
      // Allow any valid input, including empty string, will be parsed on submission
      let inputValue = typeof value === 'string' ? value : String(value)

      // Only update if valid or empty
      if (inputValue === '' || /^[0-9]*[.,]?[0-9]*$/.test(inputValue)) {
        setDisplayLoan({
          ...displayLoan,
          [field]:
            inputValue === '' ? 0 : parseFloat(inputValue.replace(',', '.')),
        })
      }
    }
    // For other numeric fields
    else if (field === 'interestRate' || field === 'termYears') {
      let inputValue = typeof value === 'string' ? value : String(value)

      // Only update if valid or empty
      if (inputValue === '' || /^[0-9]*[.,]?[0-9]*$/.test(inputValue)) {
        setDisplayLoan({
          ...displayLoan,
          [field]:
            inputValue === '' ? 0 : parseFloat(inputValue.replace(',', '.')),
        })
      }
    }
    // For non-numeric fields
    else {
      setDisplayLoan({ ...displayLoan, [field]: value })
    }
  }

  // Toggle calculation mode
  const toggleCalculationMode = () => {
    setIsCalculationMode((prevMode) =>
      prevMode === 'payment' ? 'term' : 'payment'
    )
  }

  // Handle form submission with calculation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canProceedToCalculation()) {
      return
    }

    setIsCalculating(true)

    try {
      // Create a copy of the display loan for calculations
      let updatedDisplayLoan = { ...displayLoan }

      // Calculate the missing value based on mode
      if (isCalculationMode === 'term') {
        // Calculate payment based on balance, rate, and term
        const calculatedPayment = calculatePayment()
        updatedDisplayLoan.minimumPayment = calculatedPayment
      } else {
        // Calculate term based on balance, rate, and payment
        const calculatedTerm = calculateTerm()
        updatedDisplayLoan.termYears = calculatedTerm
      }

      // Update display loan with calculated values
      setDisplayLoan(updatedDisplayLoan)

      // Convert monetary values back to USD for saving to database
      let baseValues = { ...updatedDisplayLoan }

      if (currency !== 'USD') {
        // Convert display values back to USD base values for database
        baseValues.balance = convertAmount(
          updatedDisplayLoan.balance,
          currency,
          'USD'
        )
        baseValues.minimumPayment = convertAmount(
          updatedDisplayLoan.minimumPayment,
          currency,
          'USD'
        )
      }

      // Ensure all values are numbers and properly formatted
      const formattedLoan = {
        ...baseValues,
        id: loan.id, // Ensure we keep the original ID
        balance: Number(baseValues.balance),
        interestRate: Number(baseValues.interestRate),
        termYears: Number(baseValues.termYears),
        minimumPayment: Number(baseValues.minimumPayment),
      }

      // Update the base loan state too
      setBaseLoan(formattedLoan)

      // Pass the base loan (in USD) to the save handler
      onSave(formattedLoan)
    } catch (error) {
      console.error('Error calculating loan details:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  // Format a number for display, properly handling locale
  const formatNumberInput = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === 0) return ''

    // Convert to string if not already
    let stringValue = String(value)

    // Replace any commas with periods for consistent decimal formatting
    if (typeof value === 'string') {
      // Don't do any special formatting if it's user input
      return stringValue
    }

    // For numbers, format with proper decimal places
    return value.toString()
  }

  // Get currency symbol
  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$' : currency === 'DKK' ? 'kr' : currency
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('loans.editLoan')}</DialogTitle>
            <DialogDescription>
              {t('loans.updateLoanDetails')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Loan Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t('loans.name')}
              </Label>
              <Input
                id="name"
                value={displayLoan.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            {/* Loan Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                {t('loans.type')}
              </Label>
              <Select
                value={displayLoan.loanType || LoanType.OTHER}
                onValueChange={(value) =>
                  handleChange('loanType', value as LoanType)
                }
              >
                <SelectTrigger id="type" className="col-span-3">
                  <SelectValue placeholder={t('loans.selectLoanType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LoanType.MORTGAGE}>
                    {t('loans.types.mortgage')}
                  </SelectItem>
                  <SelectItem value={LoanType.MORTGAGE_BOND}>
                    {t('loans.types.mortgage_bond')}
                  </SelectItem>
                  <SelectItem value={LoanType.HOME_LOAN}>
                    {t('loans.types.home_loan')}
                  </SelectItem>
                  <SelectItem value={LoanType.STUDENT}>
                    {t('loans.types.student')}
                  </SelectItem>
                  <SelectItem value={LoanType.AUTO}>
                    {t('loans.types.auto')}
                  </SelectItem>
                  <SelectItem value={LoanType.CREDIT_CARD}>
                    {t('loans.types.credit_card')}
                  </SelectItem>
                  <SelectItem value={LoanType.PERSONAL}>
                    {t('loans.types.personal')}
                  </SelectItem>
                  <SelectItem value={LoanType.OTHER}>
                    {t('loans.types.other')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loan Balance with Currency Indicator */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right">
                {t('loans.balance')}
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  {getCurrencySymbol()}
                </span>
                <Input
                  id="balance"
                  type="text" // Using text type for better input control
                  className="pl-7"
                  value={formatNumberInput(displayLoan.balance)}
                  onChange={(e) => handleChange('balance', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interestRate" className="text-right">
                {t('loans.interestRate')}
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="interestRate"
                  type="text" // Using text type for better input control
                  value={formatNumberInput(displayLoan.interestRate)}
                  onChange={(e) => handleChange('interestRate', e.target.value)}
                  className="pr-7"
                  required
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                  %
                </span>
              </div>
            </div>

            {/* Calculation Mode Toggle Button */}
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-gray-500">
                  {t('loans.switchTo')}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleCalculationMode}
                className="col-span-3 flex items-center"
                disabled={isCalculating}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {isCalculationMode === 'payment'
                  ? t('loans.termInput')
                  : t('loans.paymentInput')}
              </Button>
            </div>

            {/* Loan Term */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="termYears" className="text-right">
                {t('loans.term')}
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="termYears"
                  type="text" // Using text type for better input control
                  value={formatNumberInput(displayLoan.termYears)}
                  onChange={(e) => handleChange('termYears', e.target.value)}
                  disabled={isCalculationMode === 'payment'}
                  className={
                    isCalculationMode === 'payment'
                      ? 'bg-gray-50 dark:bg-gray-800 pr-10'
                      : 'pr-10'
                  }
                  required={isCalculationMode === 'term'}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                  {t('loans.years')}
                </span>
              </div>
            </div>

            {/* Monthly Payment with Currency Indicator */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minimumPayment" className="text-right">
                {t('loans.monthlyPayment')}
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  {getCurrencySymbol()}
                </span>
                <Input
                  id="minimumPayment"
                  type="text" // Using text type for better input control
                  value={formatNumberInput(displayLoan.minimumPayment)}
                  onChange={(e) =>
                    handleChange('minimumPayment', e.target.value)
                  }
                  disabled={isCalculationMode === 'term'}
                  className={
                    isCalculationMode === 'term'
                      ? 'bg-gray-50 dark:bg-gray-800 pl-7'
                      : 'pl-7'
                  }
                  required={isCalculationMode === 'payment'}
                />
              </div>
            </div>
          </div>

          {currency !== 'USD' && (
            <div className="text-xs text-gray-500 mb-4 px-4">
              {t('loans.currencyNote', {
                currency: currency,
                originalCurrency: 'USD',
              })}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!canProceedToCalculation() || isCalculating}
            >
              {isCalculating ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t('common.calculating')}
                </span>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default LoanEditDialog
