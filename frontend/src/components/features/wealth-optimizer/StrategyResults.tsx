import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { formatCurrency, formatPercent, formatTimeSpan } from './calculations'
import {
  StrategyResults,
  OptimalStrategy,
  Recommendation,
  LoanStrategyComparison,
  FINANCIAL_CONSTANTS,
} from './types'
import LoanComparison from './LoanComparison'

interface StrategyResultsProps {
  results: StrategyResults
  optimalStrategy: OptimalStrategy
  yearByYearData: any[]
  totalInterestPaid: { [key: string]: number }
  totalInvestmentValue: { [key: string]: number }
  recommendations: Recommendation[]
  loanComparisons: LoanStrategyComparison[]
}

// Colors for charts
const strategyColors = {
  'Minimum Payments + Invest': '#4f46e5', // indigo
  'Debt Avalanche': '#0ea5e9', // sky blue
  'Hybrid Approach': '#10b981', // emerald
  '5-Year Aggressive Paydown': '#f59e0b', // amber
}

const StrategyResultsComponent: React.FC<StrategyResultsProps> = ({
  results,
  optimalStrategy,
  yearByYearData,
  totalInterestPaid,
  totalInvestmentValue,
  recommendations,
  loanComparisons,
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'comparison' | 'loans'>(
    'loans'
  )

  // Prepare comparison data for the bar chart
  const prepareComparisonData = () => {
    if (!results) return []

    const comparisonData = [
      {
        category: 'Total Interest Paid',
        ...Object.keys(totalInterestPaid).reduce(
          (acc, strategy) => {
            acc[strategy] = -totalInterestPaid[strategy] // Negative to show as cost
            return acc
          },
          {} as Record<string, number>
        ),
      },
      {
        category: 'Final Investment Value',
        ...Object.keys(totalInvestmentValue).reduce(
          (acc, strategy) => {
            acc[strategy] = totalInvestmentValue[strategy]
            return acc
          },
          {} as Record<string, number>
        ),
      },
      {
        category: 'Final Net Worth',
        ...Object.keys(results).reduce(
          (acc, strategy) => {
            acc[strategy] = results[strategy].finalNetWorth
            return acc
          },
          {} as Record<string, number>
        ),
      },
    ]

    return comparisonData
  }

  return (
    <div className="space-y-8">
      {/* Optimal Strategy Card */}
      <Card className="bg-green-50 dark:bg-green-900/20">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-400">
            Recommended Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-xl font-bold">{optimalStrategy.name}</h4>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {optimalStrategy.description}
              </p>
            </div>

            <div>
              <p className="font-medium">Projected 30-year outcome:</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(results[optimalStrategy.name].finalNetWorth)}
              </p>
            </div>

            <div>
              <p className="font-medium">Why this is better:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {Object.keys(optimalStrategy.netWorthDifference).map(
                  (strategy) => (
                    <li key={strategy}>
                      <span className="font-medium">
                        {formatPercent(
                          optimalStrategy.netWorthDifference[strategy]
                        )}
                      </span>{' '}
                      better than "{strategy}"
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for switching between views */}
      <div className="border-b">
        <div className="flex space-x-8">
          <button
            className={`pb-2 font-medium ${
              activeTab === 'loans'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('loans')}
          >
            Loan-by-Loan Analysis
          </button>
          <button
            className={`pb-2 font-medium ${
              activeTab === 'chart'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('chart')}
          >
            Net Worth Over Time
          </button>
          <button
            className={`pb-2 font-medium ${
              activeTab === 'comparison'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('comparison')}
          >
            Strategy Comparison
          </button>
        </div>
      </div>

      {/* Loan-by-Loan Analysis */}
      {activeTab === 'loans' && (
        <LoanComparison
          comparisons={loanComparisons}
          spReturn={FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}
        />
      )}

      {/* Chart View */}
      {activeTab === 'chart' && (
        <div className="h-96 mt-8">
          <h3 className="text-lg font-medium mb-4">
            Net Worth Comparison Over Time
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={yearByYearData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                label={{
                  value: 'Years',
                  position: 'insideBottomRight',
                  offset: -10,
                }}
              />
              <YAxis
                tickFormatter={(value) =>
                  `$${Math.abs(value) >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : (value / 1000).toFixed(0) + 'K'}`
                }
                label={{
                  value: 'Net Worth',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Legend />
              {Object.keys(results).map((strategy) => (
                <Line
                  key={strategy}
                  type="monotone"
                  dataKey={strategy}
                  name={strategy}
                  stroke={
                    strategyColors[strategy as keyof typeof strategyColors]
                  }
                  strokeWidth={strategy === optimalStrategy.name ? 3 : 2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison View */}
      {activeTab === 'comparison' && (
        <div className="h-96 mt-8">
          <h3 className="text-lg font-medium mb-4">Strategy Comparison</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={prepareComparisonData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis
                tickFormatter={(value) =>
                  `$${Math.abs(value) >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : (value / 1000).toFixed(0) + 'K'}`
                }
              />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              {Object.keys(results).map((strategy) => (
                <Bar
                  key={strategy}
                  dataKey={strategy}
                  name={strategy}
                  fill={strategyColors[strategy as keyof typeof strategyColors]}
                  stroke={
                    strategy === optimalStrategy.name ? '#000' : undefined
                  }
                  strokeWidth={strategy === optimalStrategy.name ? 1 : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Key Metrics Table */}
      <div>
        <h3 className="text-lg font-medium mb-4">Key Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="text-left p-2">Strategy</th>
                <th className="text-right p-2">Total Interest Paid</th>
                <th className="text-right p-2">Final Investment Value</th>
                <th className="text-right p-2">Final Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(results).map((strategy) => (
                <tr
                  key={strategy}
                  className={`border-b ${strategy === optimalStrategy.name ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                  <td className="p-2 font-medium">
                    {strategy}
                    {strategy === optimalStrategy.name && (
                      <span className="ml-2 text-green-600">★</span>
                    )}
                  </td>
                  <td className="text-right p-2 text-red-600">
                    {formatCurrency(totalInterestPaid[strategy])}
                  </td>
                  <td className="text-right p-2 text-blue-600">
                    {formatCurrency(totalInvestmentValue[strategy])}
                  </td>
                  <td className="text-right p-2 font-bold">
                    {formatCurrency(results[strategy].finalNetWorth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Recommendations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personalized Recommendations</h3>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                rec.priority === 'high'
                  ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/10'
                  : 'border-blue-200 bg-blue-50 dark:bg-blue-900/10'
              }`}
            >
              <h4 className="font-bold text-md">{rec.title}</h4>
              <p className="mt-1 text-gray-700 dark:text-gray-300">
                {rec.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm space-y-2">
        <h3 className="font-medium">Important Notes:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>
            These projections use a{' '}
            {FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}%
            inflation-adjusted annual return for S&P 500 investments (historical
            average from 1928 to 2024).
          </li>
          <li>
            Actual market returns may vary significantly over time. Past
            performance is not indicative of future results.
          </li>
          <li>
            The analysis assumes consistent monthly contributions and doesn't
            account for taxes on investment gains or interest tax deductions.
          </li>
          <li>
            Your specific loan terms, income, and financial goals may require a
            customized approach.
          </li>
        </ul>
      </div>
    </div>
  )
}

export default StrategyResultsComponent
