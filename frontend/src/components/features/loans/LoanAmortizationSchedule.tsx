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
import { formatCurrency } from '@/lib/loan-calculations'
import { generateAmortizationSchedule } from '@/lib/loan-calculations'
import { Card, CardContent } from '@/components/ui/card'
import { DownloadIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

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
  const [amortizationSchedule, setAmortizationSchedule] = useState<
    AmortizationEntry[]
  >([])
  const [yearFilter, setYearFilter] = useState<'all' | number>('all')
  const [extraPayment, setExtraPayment] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12) // Default to showing 1 year

  // Generate the amortization schedule when the loan or extra payment changes
  useEffect(() => {
    if (loan) {
      const schedule = generateAmortizationSchedule(
        loan.balance,
        loan.interestRate,
        loan.minimumPayment + extraPayment
      )
      setAmortizationSchedule(schedule)
      // Reset to first page when schedule changes
      setCurrentPage(1)
    }
  }, [loan, extraPayment])

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
      'Payment #',
      'Date',
      'Payment',
      'Principal',
      'Interest',
      'Remaining Balance',
    ]
    const rows = amortizationSchedule.map((entry) => [
      entry.paymentNumber,
      entry.date,
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
    link.download = `${loan.name.replace(/\s+/g, '_')}_amortization_schedule.csv`
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <Label htmlFor="yearFilter">Filter by Year</Label>
            <Select
              value={yearFilter.toString()}
              onValueChange={(value) => {
                setYearFilter(value === 'all' ? 'all' : parseInt(value))
                setCurrentPage(1) // Reset to first page on filter change
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    Year {year + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="extraPayment">Extra Monthly Payment</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                $
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
          Download CSV
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Payments</p>
              <p className="text-xl font-semibold">
                {formatCurrency(totalPayments)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Interest</p>
              <p className="text-xl font-semibold text-orange-600">
                {formatCurrency(totalInterest)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Principal Amount</p>
              <p className="text-xl font-semibold text-blue-600">
                {formatCurrency(totalPrincipal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead className="text-right">Remaining Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleSchedule.length > 0 ? (
              visibleSchedule.map((entry) => (
                <TableRow key={entry.paymentNumber}>
                  <TableCell>{entry.paymentNumber}</TableCell>
                  <TableCell>
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>${entry.payment.toFixed(2)}</TableCell>
                  <TableCell>${entry.principal.toFixed(2)}</TableCell>
                  <TableCell>${entry.interest.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    ${entry.balance.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  No payments to display for the selected period.
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
            Showing payments {startIndex + 1} -{' '}
            {Math.min(startIndex + itemsPerPage, filteredSchedule.length)} of{' '}
            {filteredSchedule.length}
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
              Page {currentPage} of {totalPages}
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
