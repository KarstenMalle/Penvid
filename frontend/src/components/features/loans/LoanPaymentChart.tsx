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
  const { t, currency, formatCurrency } = useLocalization()

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

  // Track if a request is in progress to prevent duplicate calls
  const requestInProgressRef = useRef<boolean>(false)
  // Track if component is mounted
  const isMountedRef = useRef<boolean>(true)

  // Set mounted flag to false when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load amortization schedule
  useEffect(() => {
    if (!user || !loan) return

    // Skip if a request is already in progress
    if (requestInProgressRef.current) return

    const fetchAmortizationData = async () => {
      // Set request in progress flag
      requestInProgressRef.current = true
      setIsLoading(true)

      try {
        // Call the API for amortization schedule
        const result = await LoanCalculationService.getAmortizationSchedule(
          loan.id,
          {
            principal: loan.balance,
            annual_rate: loan.interestRate,
            monthly_payment: loan.minimumPayment,
            currency: currency,
          }
        )

        // Only update state if still mounted
        if (isMountedRef.current) {
          setAmortizationData(result.schedule)

          // Calculate summary data
          setSummaryData({
            totalPrincipal: loan.balance,
            totalInterest: result.total_interest_paid,
            totalPayments: loan.balance + result.total_interest_paid,
            monthsToPayoff: result.months_to_payoff,
          })

          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error loading amortization data:', error)

        // Only show error if still mounted
        if (isMountedRef.current) {
          toast.error(t('loans.failedToLoadAmortizationData'))
          setIsLoading(false)
        }
      } finally {
        // Reset request in progress flag
        requestInProgressRef.current = false
      }
    }

    fetchAmortizationData()
  }, [user, loan, currency, t])

  // Prepare data for balance over time chart
  const prepareBalanceChartData = () => {
    // Sample data at regular intervals to avoid too many points
    const interval = Math.max(1, Math.floor(amortizationData.length / 24))

    return amortizationData
      .filter(
        (_, index) =>
          index % interval === 0 || index === amortizationData.length - 1
      )
      .map((entry) => ({
        month: entry.month,
        balance: entry.remaining_balance,
      }))
  }

  // Prepare data for payment breakdown chart
  const preparePaymentChartData = () => {
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

    return Object.values(yearlyData)
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

    return Object.values(yearlyData)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={prepareBalanceChartData()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  label={{
                    value: t('loans.month'),
                    position: 'insideBottomRight',
                    offset: -10,
                  }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    formatCurrency(value, {
                      style: 'currency',
                      maximumFractionDigits: 0,
                      minimumFractionDigits: 0,
                    })
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value, {
                      style: 'currency',
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    }),
                    t('loans.balance'),
                  ]}
                  labelFormatter={(label) => `${t('loans.month')} ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={colors.balance}
                  activeDot={{ r: 8 }}
                  name={t('loans.balance')}
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={preparePaymentChartData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  tickFormatter={(value) =>
                    formatCurrency(value, {
                      style: 'currency',
                      maximumFractionDigits: 0,
                    })
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value, { style: 'currency' }),
                    null,
                  ]}
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={prepareInterestAnalysisData()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="80%" height="100%">
              <PieChart>
                <Pie
                  data={preparePieChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
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
                  formatter={(value: number) => [
                    formatCurrency(value, { style: 'currency' }),
                    null,
                  ]}
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
                  {formatCurrency(summaryData.totalPrincipal, {
                    style: 'currency',
                  })}
                </span>
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500">
                {t('loans.totalInterest')}
              </p>
              <p className="text-lg font-semibold">
                <span style={{ color: colors.interest }}>
                  {formatCurrency(summaryData.totalInterest, {
                    style: 'currency',
                  })}
                </span>
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500">{t('loans.totalCost')}</p>
              <p className="text-lg font-semibold">
                {formatCurrency(summaryData.totalPayments, {
                  style: 'currency',
                })}
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
