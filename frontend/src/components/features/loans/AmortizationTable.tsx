// frontend/src/components/features/loans/AmortizationTable.tsx

import React, { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { useLocalization } from '@/context/LocalizationContext'
import {
  LoanCalculationService,
  AmortizationEntry,
} from '@/services/LoanCalculationService'
import toast from 'react-hot-toast'

interface AmortizationTableProps {
  loanId: number
  principal: number
  annualRate: number
  monthlyPayment: number
  extraPayment?: number
  maxEntries?: number
}

const AmortizationTable: React.FC<AmortizationTableProps> = ({
  loanId,
  principal,
  annualRate,
  monthlyPayment,
  extraPayment = 0,
  maxEntries = 12, // Show first year by default
}) => {
  const { user } = useAuth()
  const { t, currency } = useLocalization()
  const [amortizationData, setAmortizationData] = useState<AmortizationEntry[]>(
    []
  )
  const [summary, setSummary] = useState<{
    total_interest_paid: number
    months_to_payoff: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const entriesPerPage = 12

  useEffect(() => {
    const fetchAmortizationSchedule = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Use the LoanCalculationService to get amortization schedule for this specific loan
        // IMPORTANT: We pass annualRate directly - no need to divide by 100 here
        // The service will handle it correctly now
        const result = await LoanCalculationService.getAmortizationSchedule(
          loanId,
          principal,
          annualRate,
          monthlyPayment,
          extraPayment,
          currency
        )

        if (result && result.schedule) {
          setAmortizationData(result.schedule)
          setSummary({
            total_interest_paid: result.total_interest_paid,
            months_to_payoff: result.months_to_payoff,
          })
        } else {
          throw new Error('Invalid response format from API')
        }
      } catch (error) {
        console.error('Error fetching amortization schedule:', error)
        toast.error(t('loans.failedToLoadAmortizationSchedule'))

        // Use client-side calculation as fallback
        const localSchedule =
          LoanCalculationService.generateAmortizationScheduleLocal(
            principal,
            annualRate,
            monthlyPayment,
            extraPayment
          )

        // Calculate total interest from schedule
        const totalInterest = localSchedule.reduce(
          (sum, entry) => sum + entry.interest_payment,
          0
        )

        setAmortizationData(localSchedule)
        setSummary({
          total_interest_paid: totalInterest,
          months_to_payoff: localSchedule.length,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAmortizationSchedule()
  }, [
    user,
    loanId,
    principal,
    annualRate,
    monthlyPayment,
    extraPayment,
    currency,
    t,
  ])

  const totalPages = Math.ceil(amortizationData.length / entriesPerPage)
  const currentEntries = amortizationData.slice(
    (page - 1) * entriesPerPage,
    page * entriesPerPage
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('loans.paymentNumber')}</TableHead>
              <TableHead>{t('loans.date')}</TableHead>
              <TableHead className="text-right">{t('loans.payment')}</TableHead>
              <TableHead className="text-right">
                {t('loans.principal')}
              </TableHead>
              <TableHead className="text-right">
                {t('loans.interest')}
              </TableHead>
              {extraPayment > 0 && (
                <TableHead className="text-right">
                  {t('loans.extraPayment')}
                </TableHead>
              )}
              <TableHead className="text-right">{t('loans.balance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentEntries.length > 0 ? (
              currentEntries.map((entry) => (
                <TableRow key={entry.month}>
                  <TableCell>{entry.month}</TableCell>
                  <TableCell>
                    {new Date(entry.payment_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyFormatter
                      value={entry.payment}
                      minimumFractionDigits={2}
                      maximumFractionDigits={2}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyFormatter
                      value={entry.principal_payment}
                      minimumFractionDigits={2}
                      maximumFractionDigits={2}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyFormatter
                      value={entry.interest_payment}
                      minimumFractionDigits={2}
                      maximumFractionDigits={2}
                    />
                  </TableCell>
                  {extraPayment > 0 && (
                    <TableCell className="text-right">
                      <CurrencyFormatter
                        value={entry.extra_payment}
                        minimumFractionDigits={2}
                        maximumFractionDigits={2}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <CurrencyFormatter
                      value={entry.remaining_balance}
                      minimumFractionDigits={2}
                      maximumFractionDigits={2}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={extraPayment > 0 ? 7 : 6}
                  className="text-center"
                >
                  {t('loans.noPaymentsToDisplay')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            {t('loans.showingPayments', {
              start: (page - 1) * entriesPerPage + 1,
              end: Math.min(page * entriesPerPage, amortizationData.length),
              total: amortizationData.length,
            })}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Summary Section */}
      {summary && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {t('loans.totalInterestPaid')}
            </p>
            <p className="text-xl font-bold">
              <CurrencyFormatter value={summary.total_interest_paid} />
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('loans.monthsToPayoff')}</p>
            <p className="text-xl font-bold">{summary.months_to_payoff}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('loans.totalPayments')}</p>
            <p className="text-xl font-bold">
              <CurrencyFormatter
                value={summary.total_interest_paid + principal}
              />
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AmortizationTable
