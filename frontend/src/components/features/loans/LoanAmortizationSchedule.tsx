import React, { useState, useEffect, useMemo, useRef } from 'react'
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
import { useAuth } from '@/context/AuthContext' // Add auth context
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
  const { user } = useAuth() // Get auth user context
  const [amortizationSchedule, setAmortizationSchedule] = useState<
    AmortizationEntry[]
  >([])
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [extraPayment, setExtraPayment] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [isLoading, setIsLoading] = useState(true)

  // Track if a request is in progress to prevent duplicate calls
  const requestInProgressRef = useRef<boolean>(false)
  // Track if component is mounted
  const isMountedRef = useRef<boolean>(true)

  // Set mounted flag to false when component unmounts
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch amortization schedule when loan or extraPayment changes
  useEffect(() => {
    // Skip if no loan or user
    if (!loan || !user) return

    // Skip if a request is already in progress
    if (requestInProgressRef.current) return

    async function fetchAmortizationSchedule() {
      // Set the flag that request is in progress
      requestInProgressRef.current = true
      setIsLoading(true)

      try {
        console.log('Fetching amortization schedule for loan ID:', loan.id)

        // Call the API for amortization schedule
        const result = await LoanCalculationService.getAmortizationSchedule(
          loan.id,
          {
            principal: loan.balance,
            annual_rate: loan.interestRate,
            monthly_payment: loan.minimumPayment,
            extra_payment: extraPayment,
            currency: currency,
          }
        )

        console.log('Received amortization data:', !!result)

        // Only update state if still mounted
        if (isMountedRef.current) {
          // Map the API response to our component's expected format
          const formattedSchedule = result.schedule.map((entry) => ({
            paymentNumber: entry.month,
            date: entry.payment_date,
            payment: entry.payment,
            principal: entry.principal_payment,
            interest: entry.interest_payment,
            balance: entry.remaining_balance,
          }))

          setAmortizationSchedule(formattedSchedule)
          setIsLoading(false)

          // Reset to first page when schedule changes
          setCurrentPage(1)
        }
      } catch (error) {
        console.error('Error generating amortization schedule:', error)

        // Only show error if still mounted
        if (isMountedRef.current) {
          toast.error('Failed to load amortization schedule')
          setIsLoading(false)
        }
      } finally {
        // Reset the request in progress flag
        requestInProgressRef.current = false
      }
    }

    // Execute the fetch function
    fetchAmortizationSchedule()
  }, [loan, extraPayment, currency, user])

  // Generate year options based on the schedule - memoized to avoid recalculation
  const yearOptions = useMemo(() => {
    if (!amortizationSchedule.length) return []

    // Get years from the schedule
    const years = new Set<number>()

    // Process all dates in schedule to extract distinct years
    amortizationSchedule.forEach((entry) => {
      const entryDate = new Date(entry.date)
      const year = entryDate.getFullYear()
      years.add(year)
    })

    // Convert Set to sorted array of actual calendar years
    return Array.from(years).sort((a, b) => a - b)
  }, [amortizationSchedule])

  // Filter schedule by year if needed
  const filteredSchedule = useMemo(() => {
    if (yearFilter === 'all') {
      return amortizationSchedule
    }

    // Convert yearFilter string to number
    const targetYear = parseInt(yearFilter)

    return amortizationSchedule.filter((entry) => {
      const entryDate = new Date(entry.date)
      const entryYear = entryDate.getFullYear()
      return entryYear === targetYear
    })
  }, [amortizationSchedule, yearFilter])

  // Calculate pagination
  const totalPages = Math.ceil(filteredSchedule.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const visibleSchedule = filteredSchedule.slice(
    startIndex,
    startIndex + itemsPerPage
  )

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
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600 mr-2" />
        <span>{t('common.loading')}</span>
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
              value={yearFilter}
              onValueChange={(value) => {
                setYearFilter(value)
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
                    {year}
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
