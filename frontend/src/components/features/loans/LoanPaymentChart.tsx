// frontend/src/components/features/loans/LoanPaymentChart.tsx

import React, { useState, useEffect, useRef } from 'react'
import { Loan } from '@/components/features/wealth-optimizer/types'
import {
  LoanCalculationService,
  AmortizationEntry,
} from '@/services/LoanCalculationService'
import { useAuth } from '@/context/AuthContext'
import { useLocalization } from '@/context/LocalizationContext'
import { Icons } from '@/components/ui/icons'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import toast from 'react-hot-toast'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'

interface LoanPaymentChartProps {
  loan: Loan
}

// Custom colors for charts
const colors = {
  principal: '#4f46e5', // indigo
  interest: '#ef4444', // red
  balance: '#10b981', // emerald
  payment: '#3b82f6', // blue
}

const LoanPaymentChart: React.FC<LoanPaymentChartProps> = ({ loan }) => {
  const { user } = useAuth()
  const { t, currency, locale, formatCurrency, convertAmount } =
    useLocalization()

  const [amortizationData, setAmortizationData] = useState<AmortizationEntry[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('balance')
  const [summaryData, setSummaryData] = useState<{
    totalPrincipal: number
    totalInterest: number
    totalPayments: number
    monthsToPayoff: number
  }>({
    totalPrincipal: 0,
    totalInterest: 0,
    totalPayments: 0,
    monthsToPayoff: 0,
  })

  // Track if component is mounted
  const isMountedRef = useRef<boolean>(true)

  // Set mounted flag to false when component unmounts
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load amortization schedule
  useEffect(() => {
    if (!user || !loan || !loan.id) return

    const fetchAmortizationData = async () => {
      setIsLoading(true)

      try {
        // Call the API for amortization schedule - specify currency
        const result = await LoanCalculationService.getAmortizationSchedule(
          loan.id,
          {
            principal: loan.balance,
            annual_rate: loan.interestRate,
            monthly_payment: loan.minimumPayment,
            extra_payment: 0,
            currency: currency, // Pass current currency
          }
        )

        // Only update state if still mounted
        if (isMountedRef.current) {
          // The returned schedule matches the AmortizationEntry interface required by our component
          setAmortizationData(result.schedule)

          // Calculate summary data
          setSummaryData({
            totalPrincipal: loan.balance,
            totalInterest: result.total_interest_paid,
            totalPayments: loan.balance + result.total_interest_paid,
            monthsToPayoff: result.months_to_payoff,
          })
        }
      } catch (error) {
        console.error('Error loading amortization data:', error)

        // Only show error if still mounted
        if (isMountedRef.current) {
          toast.error(t('loans.failedToLoadAmortizationData'))

          // Create minimal empty data to allow rendering without the loading spinner
          setAmortizationData([])
          setSummaryData({
            totalPrincipal: loan.balance,
            totalInterest: 0,
            totalPayments: loan.balance,
            monthsToPayoff: 0,
          })
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    fetchAmortizationData()
  }, [user, loan, currency, t])

  // Prepare data for balance over time chart grouped by year
  const prepareBalanceChartData = () => {
    if (!amortizationData || amortizationData.length === 0) {
      return []
    }

    // Group data by year
    const yearlyData: {
      [key: string]: { year: string; balance: number }
    } = {}

    // Add first data point (beginning balance)
    const firstEntry = amortizationData[0]
    if (firstEntry) {
      const firstYear = new Date(firstEntry.payment_date)
        .getFullYear()
        .toString()
      yearlyData[firstYear] = {
        year: firstYear,
        balance: firstEntry.remaining_balance,
      }
    }

    // Add data points for every year after that
    amortizationData.forEach((entry) => {
      const date = new Date(entry.payment_date)
      const year = date.getFullYear().toString()

      // Only store the last entry for each year (December or end of year balance)
      if (date.getMonth() === 11 || !yearlyData[year]) {
        yearlyData[year] = {
          year: year,
          balance: entry.remaining_balance,
        }
      }
    })

    // Add the final data point if it's not already included
    const lastEntry = amortizationData[amortizationData.length - 1]
    if (lastEntry) {
      const lastYear = new Date(lastEntry.payment_date).getFullYear().toString()
      yearlyData[lastYear] = {
        year: lastYear,
        balance: lastEntry.remaining_balance,
      }
    }

    // Convert to array and sort by year
    return Object.values(yearlyData).sort((a, b) =>
      a.year.localeCompare(b.year)
    )
  }

  // Prepare data for payment breakdown chart
  const preparePaymentChartData = () => {
    if (!amortizationData || amortizationData.length === 0) {
      return []
    }

    // Group by year to avoid too many bars
    const yearlyData: {
      [key: string]: { principal: number; interest: number; year: string }
    } = {}

    amortizationData.forEach((entry) => {
      const paymentDate = new Date(entry.payment_date)
      const year = paymentDate.getFullYear().toString()

      if (!yearlyData[year]) {
        yearlyData[year] = { principal: 0, interest: 0, year }
      }

      yearlyData[year].principal += entry.principal_payment
      yearlyData[year].interest += entry.interest_payment
    })

    return Object.values(yearlyData).sort((a, b) =>
      a.year.localeCompare(b.year)
    )
  }

  // Prepare data for pie chart
  const preparePieChartData = () => {
    return [
      {
        name: t('loans.principal'),
        value: summaryData.totalPrincipal,
        color: colors.principal,
      },
      {
        name: t('loans.interest'),
        value: summaryData.totalInterest,
        color: colors.interest,
      },
    ]
  }

  // Prepare data for interest analysis chart (interest to principal ratio by year)
  const prepareInterestAnalysisData = () => {
    if (!amortizationData || amortizationData.length === 0) {
      return []
    }

    // Group by year
    const yearlyData: {
      [key: string]: {
        principal: number
        interest: number
        year: string
        ratio: number
      }
    } = {}

    amortizationData.forEach((entry) => {
      const paymentDate = new Date(entry.payment_date)
      const year = paymentDate.getFullYear().toString()

      if (!yearlyData[year]) {
        yearlyData[year] = { principal: 0, interest: 0, year, ratio: 0 }
      }

      yearlyData[year].principal += entry.principal_payment
      yearlyData[year].interest += entry.interest_payment
    })

    // Calculate ratio for each year
    Object.values(yearlyData).forEach((yearData) => {
      const totalPayment = yearData.principal + yearData.interest
      yearData.ratio =
        totalPayment > 0 ? (yearData.interest / totalPayment) * 100 : 0
    })

    return Object.values(yearlyData).sort((a, b) =>
      a.year.localeCompare(b.year)
    )
  }

  // Format value as currency (using CurrencyFormatter to render in the correct span)
  const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="end"
          fill="#666"
          transform="rotate(-35)"
        >
          <CurrencyFormatter
            value={payload.value}
            maximumFractionDigits={0}
            minimumFractionDigits={0}
          />
        </text>
      </g>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Show empty state if no data is available
  if (!amortizationData || amortizationData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-gray-500 mb-2">
          {t('loans.noDataAvailable') || 'No data available'}
        </p>
        <p className="text-sm text-gray-400">
          {t('loans.checkLoanDetails') || 'Please check your loan details'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="balance">
            {t('loans.balanceOverTime')}
          </TabsTrigger>
          <TabsTrigger value="payments">
            {t('loans.paymentBreakdown')}
          </TabsTrigger>
          <TabsTrigger value="interest">
            {t('loans.interestAnalysis')}
          </TabsTrigger>
          <TabsTrigger value="total">
            {t('loans.totalPaymentBreakdown')}
          </TabsTrigger>
        </TabsList>

        {/* Balance Over Time Chart */}
        <TabsContent value="balance" className="pt-4">
          <h3 className="text-lg font-medium mb-4">
            {t('loans.balanceOverTime')}
          </h3>
          <div className="h-72">
            {' '}
            {/* Increased height for better visualization */}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={prepareBalanceChartData()}
                margin={{ top: 10, right: 30, left: 70, bottom: 20 }} // Increased left margin for currency
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  label={{
                    value: t('loans.years'),
                    position: 'insideBottomRight',
                    offset: -10,
                  }}
                />
                <YAxis
                  width={70} // Fixed width for y-axis to prevent cutoff
                  tickMargin={5} // Add space between tick and axis line
                  // Use CurrencyFormatter via formatter function
                  tickFormatter={(value) => {
                    // Convert to correct currency if needed
                    return new Intl.NumberFormat(
                      locale === 'da' ? 'da-DK' : 'en-US',
                      {
                        style: 'currency',
                        currency: currency,
                        maximumFractionDigits: 0,
                        minimumFractionDigits: 0,
                      }
                    ).format(value)
                  }}
                />
                <Tooltip
                  formatter={(value: number) => {
                    // Use CurrencyFormatter via custom tooltip
                    return [
                      <CurrencyFormatter
                        value={value}
                        maximumFractionDigits={2}
                        minimumFractionDigits={2}
                      />,
                      t('loans.balance'),
                    ]
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={colors.balance}
                  activeDot={{ r: 8 }}
                  name={t('loans.balance')}
                  dot={{
                    stroke: colors.balance,
                    strokeWidth: 2,
                    fill: 'white',
                    r: 3,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Payment Breakdown Chart */}
        <TabsContent value="payments" className="pt-4">
          <h3 className="text-lg font-medium mb-4">
            {t('loans.paymentBreakdown')}
          </h3>
          <div className="h-72">
            {' '}
            {/* Increased height */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={preparePaymentChartData()}
                margin={{ top: 20, right: 30, left: 70, bottom: 10 }} // Increased left margin for currency
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  width={70} // Fixed width for y-axis to prevent cutoff
                  tickMargin={5} // Add space between tick and axis line
                  // Use CurrencyFormatter via formatter function
                  tickFormatter={(value) => {
                    // Convert to correct currency if needed
                    return new Intl.NumberFormat(
                      locale === 'da' ? 'da-DK' : 'en-US',
                      {
                        style: 'currency',
                        currency: currency,
                        maximumFractionDigits: 0,
                        minimumFractionDigits: 0,
                      }
                    ).format(value)
                  }}
                />
                <Tooltip
                  formatter={(value: number) => {
                    // Use CurrencyFormatter via custom tooltip
                    return [
                      <CurrencyFormatter
                        value={value}
                        maximumFractionDigits={2}
                        minimumFractionDigits={2}
                      />,
                      null,
                    ]
                  }}
                />
                <Legend />
                <Bar
                  dataKey="principal"
                  fill={colors.principal}
                  name={t('loans.principal')}
                />
                <Bar
                  dataKey="interest"
                  fill={colors.interest}
                  name={t('loans.interest')}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Interest Analysis Chart */}
        <TabsContent value="interest" className="pt-4">
          <h3 className="text-lg font-medium mb-4">
            {t('loans.interestAnalysis')}
          </h3>
          <div className="h-72">
            {' '}
            {/* Increased height */}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={prepareInterestAnalysisData()}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(2)}%`,
                    t('loans.interestRatio'),
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  stroke={colors.interest}
                  name={t('loans.interestToPrincipalRatio')}
                  dot={{
                    stroke: colors.interest,
                    strokeWidth: 2,
                    fill: 'white',
                    r: 3,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Total Payment Breakdown Pie Chart */}
        <TabsContent value="total" className="pt-4">
          <h3 className="text-lg font-medium mb-4">
            {t('loans.principalVsInterest')}
          </h3>
          <div className="h-72 flex items-center justify-center">
            {' '}
            {/* Increased height */}
            <ResponsiveContainer width="80%" height="100%">
              <PieChart>
                <Pie
                  data={preparePieChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100} // Increased size
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={(entry) =>
                    `${entry.name}: ${Math.round((entry.percent || 0) * 100) / 100}%`
                  }
                >
                  {preparePieChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => {
                    return [
                      <CurrencyFormatter
                        value={value}
                        maximumFractionDigits={2}
                        minimumFractionDigits={2}
                      />,
                      null,
                    ]
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Summary information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500">
                {t('loans.totalPrincipal')}
              </p>
              <p className="text-lg font-semibold">
                <span style={{ color: colors.principal }}>
                  <CurrencyFormatter value={summaryData.totalPrincipal} />
                </span>
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500">
                {t('loans.totalInterest')}
              </p>
              <p className="text-lg font-semibold">
                <span style={{ color: colors.interest }}>
                  <CurrencyFormatter value={summaryData.totalInterest} />
                </span>
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500">{t('loans.totalCost')}</p>
              <p className="text-lg font-semibold">
                <CurrencyFormatter value={summaryData.totalPayments} />
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500">
                {t('loans.monthsToPayoff')}
              </p>
              <p className="text-lg font-semibold">
                {summaryData.monthsToPayoff}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LoanPaymentChart
