// frontend/src/components/features/wealth-optimizer/LoanForm.tsx
import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
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
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { ArrowRightLeft } from 'lucide-react'
import { useLocalization } from '@/context/LocalizationContext'
import { Currency } from '@/i18n/config'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'

interface LoanFormProps {
  onSave: (loan: Loan) => void
  onCancel: () => void
  existingLoan?: Loan
  currency?: Currency
}

const LoanForm: React.FC<LoanFormProps> = ({
  onSave,
  onCancel,
  existingLoan,
  currency = 'USD',
}) => {
  const { t, formatCurrency } = useLocalization()

  // Generate a unique ID for new loans
  const generateId = () => Math.floor(Math.random() * 1000000) + 1

  // Initialize state with existing loan or defaults
  const [loan, setLoan] = useState<Loan>(
    existingLoan || {
      id: generateId(),
      name: '',
      balance: 0,
      interestRate: 5.0,
      termYears: 10,
      minimumPayment: 0,
      loanType: LoanType.PERSONAL,
    }
  )

  // State for calculation mode (payment-based or term-based)
  const [calculationMode, setCalculationMode] = useState<'payment' | 'term'>(
    'payment'
  )

  // Handle input changes
  const handleChange = (field: keyof Loan, value: string | number) => {
    // Update the loan object
    setLoan({
      ...loan,
      [field]: value,
    })

    // If we're updating balance, interest rate, or term, recalculate payment
    if (
      calculationMode === 'term' &&
      (field === 'balance' || field === 'interestRate' || field === 'termYears')
    ) {
      const payment = calculateMonthlyPayment(
        field === 'balance' ? Number(value) : loan.balance,
        field === 'interestRate' ? Number(value) : loan.interestRate,
        field === 'termYears' ? Number(value) : loan.termYears
      )

      setLoan((prevLoan) => ({
        ...prevLoan,
        minimumPayment: payment,
      }))
    }

    // If we're updating balance, interest rate, or payment, recalculate term
    if (
      calculationMode === 'payment' &&
      (field === 'balance' ||
        field === 'interestRate' ||
        field === 'minimumPayment')
    ) {
      const term = calculateLoanTerm(
        field === 'balance' ? Number(value) : loan.balance,
        field === 'interestRate' ? Number(value) : loan.interestRate,
        field === 'minimumPayment' ? Number(value) : loan.minimumPayment
      )

      setLoan((prevLoan) => ({
        ...prevLoan,
        termYears: term,
      }))
    }
  }

  // Toggle calculation mode
  const toggleCalculationMode = () => {
    setCalculationMode((prev) => (prev === 'payment' ? 'term' : 'payment'))

    // Recalculate based on new mode
    if (calculationMode === 'term') {
      // Switching to payment mode, recalculate term
      const term = calculateLoanTerm(
        loan.balance,
        loan.interestRate,
        loan.minimumPayment
      )

      setLoan((prevLoan) => ({
        ...prevLoan,
        termYears: term,
      }))
    } else {
      // Switching to term mode, recalculate payment
      const payment = calculateMonthlyPayment(
        loan.balance,
        loan.interestRate,
        loan.termYears
      )

      setLoan((prevLoan) => ({
        ...prevLoan,
        minimumPayment: payment,
      }))
    }
  }

  // Calculate monthly payment
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

  // Calculate loan term
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
    const monthlyRateTimesLoan = principal * monthlyRate

    // Check if payment is sufficient to cover interest
    if (monthlyPayment <= monthlyRateTimesLoan) {
      return 30 // Cap at 30 years
    }

    const n =
      -Math.log(1 - monthlyRateTimesLoan / monthlyPayment) /
      Math.log(1 + monthlyRate)

    return Math.min(n / 12, 30) // Convert months to years, cap at 30
  }

  // Calculate total interest
  const calculateTotalInterest = (
    principal: number,
    monthlyPayment: number,
    interestRate: number
  ): number => {
    if (principal <= 0 || monthlyPayment <= 0 || interestRate <= 0) return 0

    const monthlyRate = interestRate / 100 / 12

    // Check if payment covers interest
    if (monthlyPayment <= principal * monthlyRate) {
      return Infinity
    }

    let balance = principal
    let totalInterest = 0
    let months = 0
    const MAX_MONTHS = 1200 // 100 years cap

    while (balance > 0.01 && months < MAX_MONTHS) {
      const interestAmount = balance * monthlyRate
      totalInterest += interestAmount

      const principalPayment = Math.min(
        monthlyPayment - interestAmount,
        balance
      )
      balance -= principalPayment
      months++
    }

    return totalInterest
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!loan.name || loan.balance <= 0 || loan.interestRate < 0) {
      alert(t('loans.pleaseFillAllFields'))
      return
    }

    // Save loan
    onSave(loan)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Loan Name */}
      <div className="space-y-2">
        <Label htmlFor="loan-name">{t('loans.loanName')}</Label>
        <Input
          id="loan-name"
          value={loan.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={t('loans.enterLoanName')}
          required
        />
      </div>

      {/* Loan Type */}
      <div className="space-y-2">
        <Label htmlFor="loan-type">{t('loans.type')}</Label>
        <Select
          value={loan.loanType}
          onValueChange={(value) => handleChange('loanType', value as LoanType)}
        >
          <SelectTrigger id="loan-type">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Loan Balance */}
        <div className="space-y-2">
          <Label htmlFor="loan-balance">{t('loans.currentBalance')}</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              {currency === 'USD' ? '$' : currency === 'DKK' ? 'kr' : currency}
            </span>
            <Input
              id="loan-balance"
              type="number"
              min="0"
              step="0.01"
              className="pl-7"
              value={loan.balance || ''}
              onChange={(e) =>
                handleChange('balance', parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <Label htmlFor="loan-interest">{t('loans.interestRate')} (%)</Label>
          <div className="relative">
            <Input
              id="loan-interest"
              type="number"
              min="0"
              step="0.01"
              value={loan.interestRate || ''}
              onChange={(e) =>
                handleChange('interestRate', parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              required
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
              %
            </span>
          </div>
        </div>

        {/* Term Years - Only editable in term mode */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="loan-term">
              {t('loans.term')} ({t('loans.years')})
            </Label>
            {calculationMode === 'payment' && (
              <span className="text-xs text-blue-600">
                ({t('loans.calculated')})
              </span>
            )}
          </div>
          <Input
            id="loan-term"
            type="number"
            min="0.1"
            max="50"
            step="0.1"
            value={loan.termYears.toFixed(2) || ''}
            onChange={(e) =>
              handleChange('termYears', parseFloat(e.target.value) || 0)
            }
            placeholder="0.00"
            disabled={calculationMode === 'payment'}
            className={
              calculationMode === 'payment' ? 'bg-gray-50 dark:bg-gray-800' : ''
            }
            required
          />
        </div>

        {/* Monthly Payment - Only editable in payment mode */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="loan-payment">{t('loans.monthlyPayment')}</Label>
            {calculationMode === 'term' && (
              <span className="text-xs text-blue-600">
                ({t('loans.calculated')})
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              {currency === 'USD' ? '$' : currency === 'DKK' ? 'kr' : currency}
            </span>
            <Input
              id="loan-payment"
              type="number"
              min="0"
              step="0.01"
              className="pl-7"
              value={loan.minimumPayment.toFixed(2) || ''}
              onChange={(e) =>
                handleChange('minimumPayment', parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              disabled={calculationMode === 'term'}
              className={
                calculationMode === 'term'
                  ? 'bg-gray-50 dark:bg-gray-800 pl-7'
                  : 'pl-7'
              }
              required
            />
          </div>
        </div>
      </div>

      {/* Switch Calculation Mode Button */}
      <Button
        type="button"
        variant="outline"
        onClick={toggleCalculationMode}
        className="w-full"
      >
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        {t('loans.switchTo')}{' '}
        {calculationMode === 'payment'
          ? t('loans.termInput')
          : t('loans.paymentInput')}
      </Button>

      {/* Total Interest Calculation */}
      {loan.balance > 0 && loan.interestRate > 0 && loan.minimumPayment > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <div className="font-medium">{t('loans.loanSummary')}:</div>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">
                {t('loans.totalInterest')}
              </p>
              <p className="text-lg font-semibold text-amber-600">
                <CurrencyFormatter
                  value={calculateTotalInterest(
                    loan.balance,
                    loan.minimumPayment,
                    loan.interestRate
                  )}
                  originalCurrency={currency}
                />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('loans.estimatedPayoffDate')}
              </p>
              <p className="text-lg font-semibold">
                {new Date(
                  new Date().setMonth(
                    new Date().getMonth() + loan.termYears * 12
                  )
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">
          {existingLoan ? t('common.update') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}

export default LoanForm
