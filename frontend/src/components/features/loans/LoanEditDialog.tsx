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
import { LoanCalculationService } from '@/services/LoanCalculationService'
import { ArrowRightLeft } from 'lucide-react'
import { useLocalization } from '@/context/LocalizationContext'
import { Currency, currencyConfig } from '@/i18n/config'
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
  const { t, currency } = useLocalization()
  const [editedLoan, setEditedLoan] = useState<Loan>({ ...loan })
  const [isCalculationMode, setIsCalculationMode] = useState<
    'payment' | 'term'
  >('payment')

  // Reset form when loan changes
  useEffect(() => {
    setEditedLoan({ ...loan })
  }, [loan])

  // Handle input changes
  const handleChange = (
    field: keyof Loan,
    value: string | number | LoanType
  ) => {
    const updatedLoan = { ...editedLoan, [field]: value }

    // If we're updating balance, interest rate, or term, recalculate payment
    if (
      isCalculationMode === 'term' &&
      (field === 'balance' || field === 'interestRate' || field === 'termYears')
    ) {
      // Use service to calculate payment
      calculatePayment(updatedLoan)
    }

    // If we're updating balance, interest rate, or payment, recalculate term
    if (
      isCalculationMode === 'payment' &&
      (field === 'balance' ||
        field === 'interestRate' ||
        field === 'minimumPayment')
    ) {
      // Use service to calculate term
      calculateTerm(updatedLoan)
    }

    setEditedLoan(updatedLoan)
  }

  // Calculate monthly payment using our service
  const calculatePayment = async (loanData: Loan) => {
    try {
      const result = await LoanCalculationService.calculateLoanDetails({
        principal: loanData.balance,
        annual_rate: loanData.interestRate / 100, // Convert to decimal
        term_years: loanData.termYears,
        currency: currency as Currency,
      })

      setEditedLoan((prev) => ({
        ...prev,
        minimumPayment: result.monthly_payment,
      }))
    } catch (error) {
      console.error('Error calculating payment:', error)

      // Fallback calculation if API fails
      const monthlyRate = loanData.interestRate / 100 / 12
      const numPayments = loanData.termYears * 12

      let payment = loanData.balance / numPayments // For zero interest

      if (monthlyRate > 0) {
        payment =
          (loanData.balance *
            monthlyRate *
            Math.pow(1 + monthlyRate, numPayments)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1)
      }

      setEditedLoan((prev) => ({
        ...prev,
        minimumPayment: payment,
      }))
    }
  }

  // Calculate loan term using our service
  const calculateTerm = async (loanData: Loan) => {
    if (loanData.minimumPayment <= 0) return

    try {
      const result = await LoanCalculationService.calculateLoanDetails({
        principal: loanData.balance,
        annual_rate: loanData.interestRate / 100, // Convert to decimal
        monthly_payment: loanData.minimumPayment,
        currency: currency as Currency,
      })

      setEditedLoan((prev) => ({
        ...prev,
        termYears: result.loan_term.years + (result.loan_term.months % 12) / 12,
      }))
    } catch (error) {
      console.error('Error calculating term:', error)

      // Fallback calculation if API fails
      const monthlyRate = loanData.interestRate / 100 / 12

      let termMonths = loanData.balance / loanData.minimumPayment // For zero interest

      if (monthlyRate > 0) {
        // For interest-bearing loans, use the formula: n = -log(1 - P*r/PMT) / log(1 + r)
        if (loanData.minimumPayment > loanData.balance * monthlyRate) {
          termMonths =
            -Math.log(
              1 - (loanData.balance * monthlyRate) / loanData.minimumPayment
            ) / Math.log(1 + monthlyRate)
        } else {
          termMonths = 999 // Very long term if payment barely covers interest
        }
      }

      setEditedLoan((prev) => ({
        ...prev,
        termYears: termMonths / 12,
      }))
    }
  }

  // Toggle calculation mode
  const toggleCalculationMode = () => {
    setIsCalculationMode((prev) => (prev === 'payment' ? 'term' : 'payment'))

    // Recalculate based on new mode
    if (isCalculationMode === 'term') {
      // Switching to payment mode, recalculate term
      const updatedLoan = { ...editedLoan }
      calculateTerm(updatedLoan)
    } else {
      // Switching to term mode, recalculate payment
      const updatedLoan = { ...editedLoan }
      calculatePayment(updatedLoan)
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(editedLoan)
  }

  // Format currency symbol
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
                value={editedLoan.name}
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
                value={editedLoan.loanType || LoanType.OTHER}
                onValueChange={(value) =>
                  handleChange('loanType', value as LoanType)
                }
              >
                <SelectTrigger className="col-span-3">
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

            {/* Loan Balance */}
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
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-7"
                  value={editedLoan.balance}
                  onChange={(e) =>
                    handleChange('balance', parseFloat(e.target.value) || 0)
                  }
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
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedLoan.interestRate}
                  onChange={(e) =>
                    handleChange(
                      'interestRate',
                      parseFloat(e.target.value) || 0
                    )
                  }
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
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={editedLoan.termYears.toFixed(2)}
                  onChange={(e) =>
                    handleChange('termYears', parseFloat(e.target.value) || 0)
                  }
                  disabled={isCalculationMode === 'payment'}
                  className={
                    isCalculationMode === 'payment'
                      ? 'bg-gray-50 dark:bg-gray-800 pr-10'
                      : 'pr-10'
                  }
                  required
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                  {t('loans.years')}
                </span>
              </div>
            </div>

            {/* Monthly Payment */}
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
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-7"
                  value={editedLoan.minimumPayment.toFixed(2)}
                  onChange={(e) =>
                    handleChange(
                      'minimumPayment',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  disabled={isCalculationMode === 'term'}
                  className={
                    isCalculationMode === 'term'
                      ? 'bg-gray-50 dark:bg-gray-800 pl-7'
                      : 'pl-7'
                  }
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default LoanEditDialog
