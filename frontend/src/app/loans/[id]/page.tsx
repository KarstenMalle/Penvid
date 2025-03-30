'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LoanService } from '@/services/LoanService'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
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
import { formatCurrency, formatPercent } from '@/lib/loan-calculations'
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
import {
  calculateLoanTerm,
  calculateTotalInterestPaid,
} from '@/lib/loan-calculations'
import LoanAmortizationSchedule from '@/components/features/loans/LoanAmortizationSchedule'
import LoanPaymentChart from '@/components/features/loans/LoanPaymentChart'

// Map loan types to more user-friendly labels and colors
const LOAN_TYPE_CONFIG: Record<LoanType, { label: string; color: string }> = {
  [LoanType.MORTGAGE]: {
    label: 'Mortgage',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  },
  [LoanType.STUDENT]: {
    label: 'Student',
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  },
  [LoanType.AUTO]: {
    label: 'Auto',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  },
  [LoanType.CREDIT_CARD]: {
    label: 'Credit Card',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  },
  [LoanType.PERSONAL]: {
    label: 'Personal',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  },
  [LoanType.OTHER]: {
    label: 'Other',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  },
}

export default function LoanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()

  const [loan, setLoan] = useState<Loan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'schedule' | 'payments'
  >('overview')

  // Calculate payoff date and total interest
  const payoffDate = loan ? calculatePayoffDate(loan) : null
  const totalInterest = loan
    ? calculateTotalInterestPaid(
        loan.balance,
        loan.interestRate,
        loan.minimumPayment
      )
    : 0

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
        toast.error('Invalid loan ID')
        return
      }

      setIsLoading(true)
      try {
        const loans = await LoanService.getUserLoans(user.id)
        const foundLoan = loans.find((l) => l.id === loanId)

        if (foundLoan) {
          setLoan(foundLoan)
        } else {
          toast.error('Loan not found')
          router.push('/loans')
        }
      } catch (error) {
        console.error('Error loading loan:', error)
        toast.error('Failed to load loan')
      } finally {
        setIsLoading(false)
      }
    }

    loadLoan()
  }, [user, isAuthenticated, params.id, router])

  // Calculate payoff date
  function calculatePayoffDate(loan: Loan): Date {
    const { months } = calculateLoanTerm(
      loan.balance,
      loan.interestRate,
      loan.minimumPayment
    )

    const date = new Date()
    date.setMonth(date.getMonth() + months)
    return date
  }

  // Handle loan update
  const handleUpdateLoan = async (updatedLoan: Loan) => {
    if (!isAuthenticated || !user) return

    try {
      setIsLoading(true)
      await LoanService.updateLoan(user.id, updatedLoan)
      setLoan(updatedLoan)
      setIsEditing(false)
      toast.success('Loan updated successfully')
    } catch (error) {
      console.error('Error updating loan:', error)
      toast.error('Failed to update loan')
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
      toast.success('Loan deleted successfully')
      router.push('/loans')
    } catch (error) {
      console.error('Error deleting loan:', error)
      toast.error('Failed to delete loan')
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
          <p className="text-lg text-gray-600">Loading loan details...</p>
        </div>
      </div>
    )
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-3xl">
        <div className="text-center p-12 border rounded-lg bg-white shadow-sm">
          <h2 className="text-2xl font-bold mb-4">View Loan Details</h2>
          <p className="mb-6 text-gray-600">
            You need to be logged in to view loan details.
          </p>
          <Button
            onClick={() =>
              (window.location.href = `/login?redirect=/loans/${params.id}`)
            }
          >
            Sign In
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
          <h2 className="text-2xl font-bold mb-4">Loan Not Found</h2>
          <p className="mb-6 text-gray-600">
            The loan you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Link href="/loans">
            <Button>Back to Loans</Button>
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
                  LOAN_TYPE_CONFIG[loan.loanType || LoanType.OTHER].color
                }
              >
                {LOAN_TYPE_CONFIG[loan.loanType || LoanType.OTHER].label}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2Icon className="h-4 w-4 mr-2" />
            Delete
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
            Overview
          </Button>
          <Button
            variant={activeTab === 'schedule' ? 'default' : 'outline'}
            className="mr-2"
            onClick={() => setActiveTab('schedule')}
          >
            Amortization Schedule
          </Button>
          <Button
            variant={activeTab === 'payments' ? 'default' : 'outline'}
            onClick={() => setActiveTab('payments')}
          >
            Payment Analysis
          </Button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Loan Overview</CardTitle>
                <CardDescription>
                  Key details about your {loan.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Balance
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(loan.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Interest Rate
                    </p>
                    <p className="text-2xl font-bold">
                      {formatPercent(loan.interestRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Monthly Payment
                    </p>
                    <p className="text-2xl font-bold">
                      ${loan.minimumPayment.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Term
                    </p>
                    <p className="text-2xl font-bold">
                      {loan.termYears.toFixed(2)} years
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Total interest
                    </span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(totalInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Estimated payoff date
                    </span>
                    <span className="font-semibold">
                      {payoffDate
                        ? payoffDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>
                  Important financial metrics for this loan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mr-4">
                      <DollarSignIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Total Cost
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(loan.balance + totalInterest)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mr-4">
                      <PercentIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Interest-to-Principal Ratio
                      </p>
                      <p className="text-lg font-semibold">
                        {((totalInterest / loan.balance) * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mr-4">
                      <CalendarIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Months Remaining
                      </p>
                      <p className="text-lg font-semibold">
                        {
                          calculateLoanTerm(
                            loan.balance,
                            loan.interestRate,
                            loan.minimumPayment
                          ).months
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mr-4">
                      <BarChart4Icon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Monthly Interest
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          loan.balance * (loan.interestRate / 100 / 12)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle>Amortization Schedule</CardTitle>
              <CardDescription>
                Month-by-month breakdown of your loan payments
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
              <CardTitle>Payment Analysis</CardTitle>
              <CardDescription>
                Visual breakdown of your loan payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoanPaymentChart loan={loan} />
            </CardContent>
          </Card>
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
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {loan.name}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLoan}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
