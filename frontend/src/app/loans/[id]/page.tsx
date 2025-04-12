'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LoanService } from '@/services/LoanService'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { LoanCalculationService } from '@/services/LoanCalculationService'
import { Icons } from '@/components/ui/icons'
import LoanEditDialog from '@/components/features/loans/LoanEditDialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftIcon,
  EditIcon,
  Trash2Icon,
  CalendarIcon,
  DollarSignIcon,
  PercentIcon,
  BarChart4Icon,
} from 'lucide-react'
import { formatPercent } from '@/components/features/wealth-optimizer/format-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import toast from 'react-hot-toast'
import Link from 'next/link'
import LoanAmortizationSchedule from '@/components/features/loans/LoanAmortizationSchedule'
import LoanPaymentChart from '@/components/features/loans/LoanPaymentChart'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { useLocalization } from '@/context/LocalizationContext'
import { CurrencySwitch } from '@/components/ui/currency-switch'
import LoanTaxOptimization from '@/components/features/loans/LoanTaxOptimization'
import { post } from '@/utils/apiHelper'

// Update loan types mapping to use translated values
const LOAN_TYPE_CONFIG: Record<LoanType, { color: string }> = {
  [LoanType.MORTGAGE]: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  },
  [LoanType.MORTGAGE_BOND]: {
    color:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
  },
  [LoanType.HOME_LOAN]: {
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
  },
  [LoanType.STUDENT]: {
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  },
  [LoanType.AUTO]: {
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  },
  [LoanType.CREDIT_CARD]: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  },
  [LoanType.PERSONAL]: {
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  },
  [LoanType.OTHER]: {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  },
}

export default function LoanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()
  const { t, locale, currency } = useLocalization()

  const [loan, setLoan] = useState<Loan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [calculationLoading, setCalculationLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'schedule' | 'payments'
  >('overview')

  // Loan calculation states
  const [loanDetails, setLoanDetails] = useState<{
    loanTerm: { months: number; years: number }
    totalInterest: number
    payoffDate: Date | null
    monthlyInterest: number
  }>({
    loanTerm: { months: 0, years: 0 },
    totalInterest: 0,
    payoffDate: null,
    monthlyInterest: 0,
  })

  // Load the loan data
  useEffect(() => {
    const loadLoan = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false)
        return
      }

      const loanId = Number(params.id)
      if (isNaN(loanId)) {
        setIsLoading(false)
        toast.error(t('loans.invalidLoanId'))
        return
      }

      setIsLoading(true)
      try {
        const loans = await LoanService.getUserLoans(user.id, currency)
        const foundLoan = loans.find((l) => l.id === loanId)

        if (foundLoan) {
          setLoan(foundLoan)
        } else {
          toast.error(t('loans.loanNotFound'))
          router.push('/loans')
        }
      } catch (error) {
        console.error('Error loading loan:', error)
        toast.error(t('loans.failedToLoadLoan'))
      } finally {
        setIsLoading(false)
      }
    }

    loadLoan()
  }, [user, isAuthenticated, params.id, router, t, currency])

  // Calculate loan details when loan changes - using API exclusively
  useEffect(() => {
    const calculateLoanDetails = async () => {
      if (!loan) return

      setCalculationLoading(true)
      try {
        // Use the LoanCalculationService API to calculate details
        const result = await LoanCalculationService.calculateLoanDetails({
          principal: loan.balance,
          annual_rate: loan.interestRate,
          monthly_payment: loan.minimumPayment,
          term_years: loan.termYears,
          currency: currency,
        })

        // Calculate monthly interest (simple calculation that doesn't need API)
        const monthlyRate = loan.interestRate / 100 / 12
        const monthlyInterest = loan.balance * monthlyRate

        // Calculate payoff date
        const payoffDate = new Date()
        payoffDate.setMonth(payoffDate.getMonth() + result.loan_term.months)

        setLoanDetails({
          loanTerm: result.loan_term,
          totalInterest: result.total_interest,
          payoffDate,
          monthlyInterest,
        })
      } catch (error) {
        console.error('Error calculating loan details:', error)
        toast.error(t('loans.failedToCalculateLoanDetails'))

        // Set minimal details to avoid breaking the UI
        const monthlyRate = loan.interestRate / 100 / 12
        setLoanDetails({
          loanTerm: { months: 0, years: 0 },
          totalInterest: 0,
          payoffDate: null,
          monthlyInterest: loan.balance * monthlyRate,
        })
      } finally {
        setCalculationLoading(false)
      }
    }

    calculateLoanDetails()
  }, [loan, currency, t])

  // Calculate interest-to-principal ratio
  const interestToPrincipalRatio = useMemo(() => {
    if (!loan || !loanDetails.totalInterest || loan.balance <= 0) {
      return 0
    }

    // Calculate the ratio and express as percentage
    return (loanDetails.totalInterest / loan.balance) * 100
  }, [loan, loanDetails.totalInterest])

  // Handle loan update
  const handleUpdateLoan = async (updatedLoan: Loan) => {
    if (!isAuthenticated || !user) return

    try {
      setIsLoading(true)
      await LoanService.updateLoan(user.id, updatedLoan)
      setLoan(updatedLoan)
      setIsEditing(false)
      toast.success(t('loans.loanUpdatedSuccessfully'))
    } catch (error) {
      console.error('Error updating loan:', error)
      toast.error(t('loans.failedToUpdateLoan'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle loan deletion
  const handleDeleteLoan = async () => {
    if (!isAuthenticated || !user || !loan) return

    try {
      setIsLoading(true)
      await LoanService.deleteLoan(user.id, loan.id)
      toast.success(t('loans.loanDeletedSuccessfully'))
      router.push('/loans')
    } catch (error) {
      console.error('Error deleting loan:', error)
      toast.error(t('loans.failedToDeleteLoan'))
    } finally {
      setIsLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  // Show loading state
  if (loading || isLoading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">
            {t('loans.loadingLoanDetails')}
          </p>
        </div>
      </div>
    )
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-3xl">
        <div className="text-center p-12 border rounded-lg bg-white shadow-sm">
          <h2 className="text-2xl font-bold mb-4">
            {t('loans.viewLoanDetails')}
          </h2>
          <p className="mb-6 text-gray-600">{t('loans.needLoginToViewLoan')}</p>
          <Button
            onClick={() =>
              (window.location.href = `/login?redirect=/loans/${params.id}`)
            }
          >
            {t('common.signIn')}
          </Button>
        </div>
      </div>
    )
  }

  // Show message if loan not found
  if (!loan) {
    return (
      <div className="container mx-auto p-8 max-w-3xl">
        <div className="text-center p-12 border rounded-lg bg-white shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{t('loans.loanNotFound')}</h2>
          <p className="mb-6 text-gray-600">{t('loans.loanNotFoundMessage')}</p>
          <Link href="/loans">
            <Button>{t('common.backToLoans')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/loans">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{loan.name}</h1>
            <div className="flex items-center mt-1">
              <Badge
                className={
                  (
                    LOAN_TYPE_CONFIG[loan.loanType] ??
                    LOAN_TYPE_CONFIG[LoanType.OTHER]
                  ).color
                }
              >
                {t(
                  `loans.types.${(loan.loanType || LoanType.OTHER).toLowerCase()}`
                )}
              </Badge>
              <div className="ml-2">
                <CurrencySwitch minimal size="sm" variant="ghost" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <EditIcon className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2Icon className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex mb-4">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            className="mr-2"
            onClick={() => setActiveTab('overview')}
          >
            {t('loans.overview')}
          </Button>
          <Button
            variant={activeTab === 'schedule' ? 'default' : 'outline'}
            className="mr-2"
            onClick={() => setActiveTab('schedule')}
          >
            {t('loans.amortizationSchedule')}
          </Button>
          <Button
            variant={activeTab === 'payments' ? 'default' : 'outline'}
            onClick={() => setActiveTab('payments')}
          >
            {t('loans.paymentAnalysis')}
          </Button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('loans.loanOverview')}</CardTitle>
                <CardDescription>
                  {t('loans.keyDetailsAbout')} {loan.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculationLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <Icons.spinner className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('loans.balance')}
                        </p>
                        <p className="text-2xl font-bold">
                          <CurrencyFormatter value={loan.balance} />
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('loans.interestRate')}
                        </p>
                        <p className="text-2xl font-bold">
                          {formatPercent(loan.interestRate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('loans.monthlyPayment')}
                        </p>
                        <p className="text-2xl font-bold">
                          <CurrencyFormatter
                            value={loan.minimumPayment}
                            minimumFractionDigits={2}
                            maximumFractionDigits={2}
                          />
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('loans.term')}
                        </p>
                        <p className="text-2xl font-bold">
                          {loan.termYears.toFixed(2)} {t('loans.years')}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          {t('loans.totalInterest')}
                        </span>
                        <span className="font-semibold text-orange-600">
                          <CurrencyFormatter
                            value={loanDetails.totalInterest}
                          />
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          {t('loans.estimatedPayoffDate')}
                        </span>
                        <span className="font-semibold">
                          {loanDetails.payoffDate
                            ? new Date(
                                loanDetails.payoffDate
                              ).toLocaleDateString(
                                locale === 'da' ? 'da-DK' : 'en-US',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric', // Add day for more precise date
                                }
                              )
                            : t('common.notAvailable')}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('loans.keyMetrics')}</CardTitle>
                <CardDescription>
                  {t('loans.importantFinancialMetrics')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculationLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <Icons.spinner className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mr-4">
                        <DollarSignIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('loans.totalCost')}
                        </p>
                        <p className="text-lg font-semibold">
                          <CurrencyFormatter
                            value={loan.balance + loanDetails.totalInterest}
                          />
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mr-4">
                        <PercentIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('loans.interestToPrincipalRatio')}
                        </p>
                        <p className="text-lg font-semibold">
                          {interestToPrincipalRatio.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mr-4">
                        <CalendarIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('loans.monthsRemaining')}
                        </p>
                        <p className="text-lg font-semibold">
                          {loanDetails.loanTerm.months}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mr-4">
                        <BarChart4Icon className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('loans.monthlyInterest')}
                        </p>
                        <p className="text-lg font-semibold">
                          <CurrencyFormatter
                            value={loanDetails.monthlyInterest}
                            minimumFractionDigits={2}
                            maximumFractionDigits={2}
                          />
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('loans.amortizationSchedule')}</CardTitle>
              <CardDescription>
                {t('loans.monthByMonthBreakdown')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoanAmortizationSchedule loan={loan} />
            </CardContent>
          </Card>
        )}

        {activeTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('loans.paymentAnalysis')}</CardTitle>
              <CardDescription>{t('loans.visualBreakdown')}</CardDescription>
            </CardHeader>
            <CardContent>
              <LoanPaymentChart loan={loan} />
            </CardContent>
          </Card>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add the Tax Optimization Component */}
            <div className="md:col-span-2 mt-6">
              <LoanTaxOptimization
                loanId={loan.id}
                loanType={loan.loanType || 'OTHER'}
                loanName={loan.name}
                balance={loan.balance}
                interestRate={loan.interestRate}
              />
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {isEditing && (
        <LoanEditDialog
          loan={loan}
          open={isEditing}
          onSave={handleUpdateLoan}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('loans.confirmDeletion')}</DialogTitle>
            <DialogDescription>
              {t('loans.deleteConfirmMessage', { loanName: loan.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteLoan}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
