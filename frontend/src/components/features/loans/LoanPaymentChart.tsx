import React, { useState, useEffect } from 'react'
import { Loan } from '@/components/features/wealth-optimizer/types'
import { generateAmortizationSchedule } from '@/lib/loan-calculations'
import { Card, CardContent } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'

interface LoanPaymentChartProps {
  loan: Loan
}

const LoanPaymentChart: React.FC<LoanPaymentChartProps> = ({ loan }) => {
  const [chartType, setChartType] = useState<
    'balance' | 'payment' | 'interest'
  >('balance')
  const [amortizationData, setAmortizationData] = useState<any[]>([])

  // Generate chart data when loan changes
  useEffect(() => {
    if (loan) {
      const schedule = generateAmortizationSchedule(
        loan.balance,
        loan.interestRate,
        loan.minimumPayment
      )

      // Group data by year for better readability
      const yearlyData = schedule.reduce(
        (acc, entry) => {
          const entryDate = new Date(entry.date)
          const year = entryDate.getFullYear()
          const month = entryDate.getMonth()

          // Create a key for the year and quarter
          const yearKey = year

          if (!acc[yearKey]) {
            acc[yearKey] = {
              date: `${year}`,
              balance: 0,
              principalPaid: 0,
              interestPaid: 0,
              totalPaid: 0,
              yearlyPrincipal: 0,
              yearlyInterest: 0,
            }
          }

          // Update the last balance (which will be the final balance for the year)
          acc[yearKey].balance = entry.balance

          // Accumulate the payments for the year
          acc[yearKey].principalPaid += entry.principal
          acc[yearKey].interestPaid += entry.interest
          acc[yearKey].totalPaid += entry.payment

          // For the current year, track monthly data
          if (year === new Date().getFullYear()) {
            acc[yearKey][`month${month + 1}Principal`] = entry.principal
            acc[yearKey][`month${month + 1}Interest`] = entry.interest
          }

          // If this is the first entry of the year, record yearlyPrincipal and yearlyInterest
          if (!acc[yearKey].yearlyPrincipal && !acc[yearKey].yearlyInterest) {
            acc[yearKey].yearlyPrincipal = entry.principal
            acc[yearKey].yearlyInterest = entry.interest
          }

          return acc
        },
        {} as Record<string, any>
      )

      // Convert to array and sort by year
      const chartData = Object.values(yearlyData).sort((a, b) =>
        a.date.localeCompare(b.date)
      )

      setAmortizationData(chartData)
    }
  }, [loan])

  // Calculate summary data
  const totalInterest = amortizationData.reduce(
    (sum, entry) => sum + entry.interestPaid,
    0
  )
  const totalPrincipal = loan.balance

  // Data for pie chart
  const pieData = [
    { name: 'Principal', value: totalPrincipal, color: '#3b82f6' },
    { name: 'Interest', value: totalInterest, color: '#ef4444' },
  ]

  // Render the appropriate chart based on selected type
  const renderChart = () => {
    switch (chartType) {
      case 'balance':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={amortizationData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                tickFormatter={(value) =>
                  `$${Math.round(value).toLocaleString()}`
                }
              />
              <Tooltip
                formatter={(value: any) => [
                  `$${Math.round(value).toLocaleString()}`,
                  'Balance',
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                name="Remaining Balance"
                stroke="#3b82f6"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'payment':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={amortizationData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                tickFormatter={(value) =>
                  `$${Math.round(value).toLocaleString()}`
                }
              />
              <Tooltip
                formatter={(value: any) => [
                  `$${Math.round(value).toLocaleString()}`,
                ]}
              />
              <Legend />
              <Bar
                dataKey="principalPaid"
                name="Principal"
                stackId="a"
                fill="#3b82f6"
              />
              <Bar
                dataKey="interestPaid"
                name="Interest"
                stackId="a"
                fill="#ef4444"
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'interest':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center mb-2">
                  <h3 className="text-lg font-semibold">
                    Total Payment Breakdown
                  </h3>
                  <p className="text-sm text-gray-500">Principal vs Interest</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [
                          `$${Math.round(value).toLocaleString()}`,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center mb-2">
                  <h3 className="text-lg font-semibold">
                    Interest to Principal Ratio
                  </h3>
                  <p className="text-sm text-gray-500">By Payment Year</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={amortizationData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis
                        tickFormatter={(value) => `${Math.round(value * 100)}%`}
                      />
                      <Tooltip
                        formatter={(value: any) => [
                          `${(value * 100).toFixed(1)}%`,
                        ]}
                      />
                      <Legend />
                      <Bar
                        dataKey={(entry) =>
                          entry.interestPaid /
                          (entry.principalPaid + entry.interestPaid)
                        }
                        name="Interest Ratio"
                        fill="#ef4444"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex rounded-md shadow-sm">
          <Button
            variant={chartType === 'balance' ? 'default' : 'outline'}
            onClick={() => setChartType('balance')}
            className="rounded-l-md rounded-r-none"
          >
            Balance Over Time
          </Button>
          <Button
            variant={chartType === 'payment' ? 'default' : 'outline'}
            onClick={() => setChartType('payment')}
            className="rounded-none border-l-0 border-r-0"
          >
            Payment Breakdown
          </Button>
          <Button
            variant={chartType === 'interest' ? 'default' : 'outline'}
            onClick={() => setChartType('interest')}
            className="rounded-r-md rounded-l-none"
          >
            Interest Analysis
          </Button>
        </div>
      </div>

      {renderChart()}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Principal</p>
              <p className="text-xl font-semibold text-blue-600">
                ${loan.balance.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Interest</p>
              <p className="text-xl font-semibold text-red-600">
                ${Math.round(totalInterest).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Interest-to-Principal Ratio
              </p>
              <p className="text-xl font-semibold text-purple-600">
                {((totalInterest / loan.balance) * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoanPaymentChart
