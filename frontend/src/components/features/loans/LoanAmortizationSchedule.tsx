import React, { useState, useEffect } from 'react'
import { Loan } from '@/components/features/wealth-optimizer/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { DownloadIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { LoanCalculationService } from '@/services/LoanCalculationService'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { useLocalization } from '@/context/LocalizationContext'
import { Icons } from '@/components/ui/icons'
import toast from 'react-hot-toast'

interface LoanAmortizationScheduleProps {
  loan: Loan
}

type AmortizationEntry = {
  paymentNumber: number
  date: string
  payment: number
  principal: number
  interest: number
  balance: number
}

const LoanAmortizationSchedule: React.FC<LoanAmortizationScheduleProps> = ({
  loan,
}) => {
  const { t, locale, currency } = useLocalization()
  const [amortizationSchedule, setAmortizationSchedule] = useState<
    AmortizationEntry[]
  >([])
  const [yearFilter, setYearFilter] = useState<'all' | number>('all')
  const [extraPayment, setExtraPayment] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [isLoading, setIsLoading] = useState(false)

  // Generate the amortization schedule when the loan or extra payment changes
  useEffect(() => {
    // Updated fetchAmortizationSchedule function in LoanAmortizationSchedule.tsx

    const fetchAmortizationSchedule = async () => {
      if (!loan) return

      setIsLoading(true)
      try {
        // Use the LoanCalculationService to get the amortization schedule
        const scheduleData =
          await LoanCalculationService.getAmortizationSchedule(loan.id, {
            principal: loan.balance,
            annual_rate: loan.interestRate,
            monthly_payment: loan.minimumPayment,
            extra_payment: extraPayment,
            currency: currency,
          })

        // Map the API response to our component's expected format
        const formattedSchedule = scheduleData.schedule.map((entry, index) => ({
          paymentNumber: entry.month,
          date: entry.payment_date,
          payment: entry.payment,
          principal: entry.principal_payment,
          interest: entry.interest_payment,
          balance: entry.remaining_balance,
        }))

        setAmortizationSchedule(formattedSchedule)

        // Reset to first page when schedule changes
        setCurrentPage(1)
      } catch (error) {
        console.error('Error generating amortization schedule:', error)
        toast.error('Failed to generate amortization schedule')

        // Set empty schedule on error
        setAmortizationSchedule([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAmortizationSchedule()
  }, [loan, extraPayment, currency])

  // Filter schedule by year if needed
  const filteredSchedule =
    yearFilter === 'all'
      ? amortizationSchedule
      : amortizationSchedule.filter((entry) => {
          const entryDate = new Date(entry.date)
          const entryYear = entryDate.getFullYear()
          const currentYear = new Date().getFullYear()
          return entryYear === currentYear + (yearFilter as number)
        })

  // Calculate pagination
  const totalPages = Math.ceil(filteredSchedule.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const visibleSchedule = filteredSchedule.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  // Generate year options for filter
  const yearOptions = []
  const totalYears = Math.ceil(amortizationSchedule.length / 12)

  for (let i = 0; i < Math.min(totalYears, 30); i++) {
    yearOptions.push(i)
  }

  // Handle extra payment input change
  const handleExtraPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
    setExtraPayment(isNaN(value) ? 0 : value)
  }

  // Handle CSV download
  const downloadCSV = () => {
    // Create CSV content
    const headers = [
      t('loans.paymentNumber'),
      t('loans.date'),
      t('loans.payment'),
      t('loans.principal'),
      t('loans.interest'),
      t('loans.remainingBalance'),
    ]

    // Convert all amounts to the selected currency for the CSV
    const rows = amortizationSchedule.map((entry) => [
      entry.paymentNumber,
      new Date(entry.date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
      }),
      entry.payment.toFixed(2),
      entry.principal.toFixed(2),
      entry.interest.toFixed(2),
      entry.balance.toFixed(2),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${loan.name.replace(/\s+/g, '_')}_amortization_schedule_${currency}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Summary calculations
  const totalPayments = amortizationSchedule.reduce(
    (sum, entry) => sum + entry.payment,
    0
  )
  const totalInterest = amortizationSchedule.reduce(
    (sum, entry) => sum + entry.interest,
    0
  )
  const totalPrincipal = amortizationSchedule.reduce(
    (sum, entry) => sum + entry.principal,
    0
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <Label htmlFor="yearFilter">{t('loans.filterByYear')}</Label>
            <Select
              value={yearFilter.toString()}
              onValueChange={(value) => {
                setYearFilter(value === 'all' ? 'all' : parseInt(value))
                setCurrentPage(1) // Reset to first page on filter change
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t('loans.selectYear')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('loans.allYears')}</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {t('loans.yearNumber', { year: year + 1 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="extraPayment">
              {t('loans.extraMonthlyPayment')}
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                {currency === 'USD' ? '$' : 'kr'}
              </span>
              <Input
                id="extraPayment"
                type="number"
                min="0"
                step="10"
                value={extraPayment || ''}
                onChange={handleExtraPaymentChange}
                className="pl-7 w-36"
              />
            </div>
          </div>
        </div>

        <Button onClick={downloadCSV} className="flex items-center">
          <DownloadIcon className="mr-2 h-4 w-4" />
          {t('loans.downloadCSV')}
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">
                {t('loans.totalPayments')}
              </p>
              <p className="text-xl font-semibold">
                <CurrencyFormatter value={totalPayments} />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('loans.totalInterest')}
              </p>
              <p className="text-xl font-semibold text-orange-600">
                <CurrencyFormatter value={totalInterest} />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('loans.principalAmount')}
              </p>
              <p className="text-xl font-semibold text-blue-600">
                <CurrencyFormatter value={totalPrincipal} />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('loans.paymentNumber')}</TableHead>
              <TableHead>{t('loans.date')}</TableHead>
              <TableHead>{t('loans.payment')}</TableHead>
              <TableHead>{t('loans.principal')}</TableHead>
              <TableHead>{t('loans.interest')}</TableHead>
              <TableHead className="text-right">
                {t('loans.remainingBalance')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleSchedule.length > 0 ? (
              visibleSchedule.map((entry) => (
                <TableRow key={entry.paymentNumber}>
                  <TableCell>{entry.paymentNumber}</TableCell>
                  <TableCell>
                    {new Date(entry.date).toLocaleDateString(
                      locale === 'da' ? 'da-DK' : 'en-US',
                      {
                        month: 'short',
                        year: 'numeric',
                      }
                    )}
                  </TableCell>
                  <TableCell>
                    <CurrencyFormatter
                      value={entry.payment}
                      minimumFractionDigits={2}
                      maximumFractionDigits={2}
                    />
                  </TableCell>
                  <TableCell>
                    <CurrencyFormatter
                      value={entry.principal}
                      minimumFractionDigits={2}
                      maximumFractionDigits={2}
                    />
                  </TableCell>
                  <TableCell>
                    <CurrencyFormatter
                      value={entry.interest}
                      minimumFractionDigits={2}
                      maximumFractionDigits={2}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyFormatter
                      value={entry.balance}
                      minimumFractionDigits={2}
                      maximumFractionDigits={2}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  {t('loans.noPaymentsToDisplay')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t('loans.showingPayments', {
              start: startIndex + 1,
              end: Math.min(startIndex + itemsPerPage, filteredSchedule.length),
              total: filteredSchedule.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {t('common.pageXOfY', {
                current: currentPage,
                total: totalPages,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoanAmortizationSchedule
