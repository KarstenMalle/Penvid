// frontend/src/components/features/investments/InvestmentChart.tsx

import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Icons } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FinancialApiService,
  InvestmentEntry,
} from '@/services/FinancialApiService'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { useLocalization } from '@/context/LocalizationContext'
import toast from 'react-hot-toast'

interface InvestmentChartProps {
  monthlyAmount: number
  annualReturn: number
  months: number
  inflationRate?: number
  riskFactor?: number
}

const InvestmentChart: React.FC<InvestmentChartProps> = ({
  monthlyAmount,
  annualReturn,
  months,
  inflationRate = 0.025,
  riskFactor = 0.2,
}) => {
  const { t, currency } = useLocalization()
  const [projectionData, setProjectionData] = useState<InvestmentEntry[]>([])
  const [summary, setSummary] = useState<{
    final_balance: number
    inflation_adjusted_final_balance: number
    risk_adjusted_balance: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInvestmentProjection = async () => {
      setIsLoading(true)
      try {
        const result = await FinancialApiService.getInvestmentProjection(
          monthlyAmount,
          annualReturn / 100, // Convert percentage to decimal
          months,
          inflationRate,
          riskFactor,
          currency
        )

        // Format dates for chart display
        const formattedData = result.projection.map((entry) => ({
          ...entry,
          formattedDate: new Date(entry.date).toLocaleDateString(),
        }))

        setProjectionData(formattedData || [])
        setSummary({
          final_balance: result.final_balance,
          inflation_adjusted_final_balance:
            result.inflation_adjusted_final_balance,
          risk_adjusted_balance: result.risk_adjusted_balance,
        })
      } catch (error) {
        console.error('Error fetching investment projection:', error)
        toast.error(t('investments.failedToLoadProjection'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvestmentProjection()
  }, [
    monthlyAmount,
    annualReturn,
    months,
    inflationRate,
    riskFactor,
    currency,
    t,
  ])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Get data for display at specific intervals for cleaner chart
  const getChartData = () => {
    if (projectionData.length <= 24) return projectionData

    // For longer timeframes, show fewer points
    const interval = Math.ceil(projectionData.length / 24)
    return projectionData.filter(
      (_, index) =>
        index % interval === 0 || index === projectionData.length - 1
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('investments.investmentProjection')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={getChartData()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                label={{
                  value: t('investments.month'),
                  position: 'insideBottomRight',
                  offset: -10,
                }}
              />
              <YAxis
                tickFormatter={(value) => {
                  return value >= 1000000
                    ? `${(value / 1000000).toFixed(1)}M`
                    : value >= 1000
                      ? `${(value / 1000).toFixed(1)}K`
                      : value.toFixed(0)
                }}
                label={{
                  value: t('investments.value'),
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                formatter={(value: any) => [
                  <CurrencyFormatter value={value} />,
                  null,
                ]}
                labelFormatter={(label) => `${t('investments.month')} ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                name={t('investments.projectedValue')}
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="inflation_adjusted_balance"
                name={t('investments.inflationAdjusted')}
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="risk_adjusted_balance"
                name={t('investments.riskAdjusted')}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Section */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('investments.projectedValue')}
              </p>
              <p className="text-xl font-bold">
                <CurrencyFormatter value={summary.final_balance} />
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('investments.nominalValueDescription')}
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('investments.inflationAdjusted')}
              </p>
              <p className="text-xl font-bold">
                <CurrencyFormatter
                  value={summary.inflation_adjusted_final_balance}
                />
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('investments.inflationAdjustedDescription', {
                  rate: (inflationRate * 100).toFixed(1),
                })}
              </p>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('investments.riskAdjusted')}
              </p>
              <p className="text-xl font-bold">
                <CurrencyFormatter value={summary.risk_adjusted_balance} />
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('investments.riskAdjustedDescription', {
                  factor: (riskFactor * 100).toFixed(0),
                })}
              </p>
            </div>
          </div>
        )}

        {/* Input Summary */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium">
            {t('investments.calculationAssumptions')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div>
              <p className="text-sm text-gray-500">
                {t('investments.monthlyInvestment')}
              </p>
              <p className="font-medium">
                <CurrencyFormatter
                  value={monthlyAmount}
                  minimumFractionDigits={2}
                  maximumFractionDigits={2}
                />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('investments.annualReturn')}
              </p>
              <p className="font-medium">{annualReturn.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('investments.timespan')}
              </p>
              <p className="font-medium">
                {months} {t('investments.months')}({(months / 12).toFixed(1)}{' '}
                {t('investments.years')})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('investments.totalContributions')}
              </p>
              <p className="font-medium">
                <CurrencyFormatter value={monthlyAmount * months} />
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default InvestmentChart
