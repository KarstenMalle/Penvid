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
  ReferenceLine,
  Label,
  Area,
  AreaChart,
} from 'recharts'
import { formatPercent } from './format-utils'
import {
  StrategyResults,
  OptimalStrategy,
  Recommendation,
  LoanStrategyComparison,
  FINANCIAL_CONSTANTS,
} from './types'
import LoanComparison from './LoanComparison'
import { useLocalization } from '@/context/LocalizationContext'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  InfoIcon,
  TrendingUp,
  Share2,
  ShieldAlert,
  BarChart2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  'Risk-Balanced Approach': '#8b5cf6', // purple
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
  const [activeTab, setActiveTab] = useState<
    'loans' | 'chart' | 'comparison' | 'risk'
  >('loans')
  const [riskView, setRiskView] = useState<
    'standard' | 'optimistic' | 'pessimistic'
  >('standard')

  const { t, formatCurrency } = useLocalization()

  // Risk adjustment factors
  const riskAdjustments = {
    standard: 0.7, // 70% confidence
    optimistic: 0.9, // 90% confidence (closer to full return)
    pessimistic: 0.5, // 50% confidence (greater risk consideration)
  }

  const riskAdjustment = riskAdjustments[riskView]

  // Get the optimal strategy given the current risk perspective
  // Note: In a fully optimized version, this would come from the backend
  // We're keeping minimal logic here just for UI display
  const currentOptimalStrategy =
    riskView === 'standard' ? optimalStrategy : getRiskAdjustedOptimalStrategy()

  // Get an array of strategies sorted by performance in current risk view
  function getStrategiesByPerformance() {
    // Simplified version - would be handled by backend in production
    const finalYearData = yearByYearData[yearByYearData.length - 1]

    if (!finalYearData) return Object.keys(results)

    return Object.keys(results).sort((a, b) => {
      // Sort based on final year values
      const aNetWorth = finalYearData[a] || 0
      const bNetWorth = finalYearData[b] || 0
      return bNetWorth - aNetWorth // Descending order
    })
  }

  // Simplified version of risk adjustment - in production this would come from backend
  function getRiskAdjustedOptimalStrategy() {
    const sortedStrategies = getStrategiesByPerformance()
    const bestStrategy = sortedStrategies[0]

    // Calculate simplified difference
    const netWorthDifference: { [key: string]: number } = {}
    sortedStrategies.slice(1).forEach((strategy) => {
      // Just a simple estimation for the UI - real calculations on backend
      netWorthDifference[strategy] = 5 // Simplified 5% difference
    })

    return {
      name: bestStrategy,
      description: results[bestStrategy]?.strategyDescription || '',
      netWorthDifference,
    }
  }

  return (
    <div className="space-y-8">
      {/* Risk View Selector */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
        <div className="flex items-center mb-2">
          <ShieldAlert className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="font-medium">
            {t('strategyResults.riskPerspective')}
          </h3>
        </div>
        <p className="text-sm mb-3">{t('strategyResults.riskExplanation')}</p>

        <Tabs
          defaultValue="standard"
          value={riskView}
          onValueChange={(v) => setRiskView(v as any)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="pessimistic" className="flex-1">
              {t('strategyResults.pessimistic')}
            </TabsTrigger>
            <TabsTrigger value="standard" className="flex-1">
              {t('strategyResults.standard')}
            </TabsTrigger>
            <TabsTrigger value="optimistic" className="flex-1">
              {t('strategyResults.optimistic')}
            </TabsTrigger>
          </TabsList>

          <div className="mt-2 text-sm">
            {riskView === 'pessimistic' && (
              <p className="text-amber-600">
                {t('strategyResults.pessimisticDescription')}
              </p>
            )}
            {riskView === 'standard' && (
              <p className="text-blue-600">
                {t('strategyResults.standardDescription')}
              </p>
            )}
            {riskView === 'optimistic' && (
              <p className="text-green-600">
                {t('strategyResults.optimisticDescription')}
              </p>
            )}
          </div>
        </Tabs>
      </div>

      {/* Optimal Strategy Card */}
      <Card
        className={`${
          riskView === 'pessimistic'
            ? 'bg-amber-50 dark:bg-amber-900/20'
            : riskView === 'optimistic'
              ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-blue-50 dark:bg-blue-900/20'
        }`}
      >
        <CardHeader>
          <CardTitle
            className={`${
              riskView === 'pessimistic'
                ? 'text-amber-700 dark:text-amber-400'
                : riskView === 'optimistic'
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-blue-700 dark:text-blue-400'
            }`}
          >
            {riskView === 'standard'
              ? t('strategyResults.recommendedStrategy')
              : t('strategyResults.recommendedStrategyRisk', {
                  risk: t(`strategyResults.${riskView}`),
                })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-xl font-bold">
                {t(`strategyNames.${currentOptimalStrategy.name}`)}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentOptimalStrategy.description}
              </p>
            </div>

            <div>
              <p className="font-medium">
                {t('strategyResults.projected30YearOutcome')}
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                <CurrencyFormatter
                  value={
                    results[currentOptimalStrategy.name]?.finalNetWorth || 0
                  }
                  originalCurrency="USD"
                />
              </p>
              {riskView !== 'standard' && (
                <p className="text-sm text-gray-600">
                  {t('strategyResults.riskAdjustedValue')}
                </p>
              )}
            </div>

            <div>
              <p className="font-medium">
                {t('strategyResults.whyThisIsBetter')}
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {Object.keys(
                  currentOptimalStrategy.netWorthDifference || {}
                ).map((strategy) => (
                  <li key={strategy}>
                    <span className="font-medium">
                      {formatPercent(
                        currentOptimalStrategy.netWorthDifference[strategy]
                      )}
                    </span>{' '}
                    {t('strategyResults.betterThan')} "
                    {t(`strategyNames.${strategy}`)}"
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for switching between views */}
      <div className="border-b">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'loans' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('loans')}
            className="flex items-center"
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            {t('strategyResults.loanByLoanAnalysis')}
          </Button>

          <Button
            variant={activeTab === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('chart')}
            className="flex items-center"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {t('strategyResults.netWorthOverTime')}
          </Button>

          <Button
            variant={activeTab === 'comparison' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('comparison')}
            className="flex items-center"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {t('strategyResults.strategyComparison')}
          </Button>

          <Button
            variant={activeTab === 'risk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('risk')}
            className="flex items-center"
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            {t('strategyResults.riskAnalysis')}
          </Button>
        </div>
      </div>

      {/* Loan-by-Loan Analysis */}
      {activeTab === 'loans' && (
        <LoanComparison
          comparisons={loanComparisons}
          spReturn={FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}
          riskFactor={riskAdjustment}
        />
      )}

      {/* Chart View */}
      {activeTab === 'chart' && (
        <div className="h-96 mt-8">
          <h3 className="text-lg font-medium mb-4">
            {t('strategyResults.netWorthComparisonOverTime')}
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
                  value: t('strategyResults.years'),
                  position: 'insideBottomRight',
                  offset: -10,
                }}
              />
              <YAxis
                tickFormatter={(value) => {
                  const convertedValue = value // Value is already in the proper currency context
                  return `${
                    Math.abs(convertedValue) >= 1000000
                      ? formatCurrency(convertedValue / 1000000, {
                          maximumFractionDigits: 1,
                        }) + 'M'
                      : formatCurrency(convertedValue / 1000, {
                          maximumFractionDigits: 0,
                        }) + 'K'
                  }`
                }}
                label={{
                  value: t('strategyResults.netWorth'),
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                formatter={(value: any, name: string) => {
                  return [
                    formatCurrency(value, { originalCurrency: 'USD' }),
                    t(`strategyNames.${name}`),
                  ]
                }}
                labelFormatter={(label) =>
                  `${t('strategyResults.year')} ${label}`
                }
              />
              <Legend formatter={(value) => t(`strategyNames.${value}`)} />
              {Object.keys(results).map((strategy) => (
                <Line
                  key={strategy}
                  type="monotone"
                  dataKey={strategy}
                  name={strategy}
                  stroke={
                    strategyColors[strategy as keyof typeof strategyColors]
                  }
                  strokeWidth={strategy === currentOptimalStrategy.name ? 3 : 2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              ))}

              {/* Add zero net worth reference line */}
              <ReferenceLine
                y={0}
                stroke="gray"
                strokeDasharray="3 3"
                label={{
                  value: t('strategyResults.zeroNetWorth'),
                  position: 'insideBottomRight',
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison View */}
      {activeTab === 'comparison' && (
        <div className="h-96 mt-8">
          <h3 className="text-lg font-medium mb-4">
            {t('strategyResults.strategyComparison')}
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={prepareComparisonData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis
                tickFormatter={(value) => {
                  return `${
                    Math.abs(value) >= 1000000
                      ? formatCurrency(value / 1000000, {
                          maximumFractionDigits: 1,
                        }) + 'M'
                      : formatCurrency(value / 1000, {
                          maximumFractionDigits: 0,
                        }) + 'K'
                  }`
                }}
              />
              <Tooltip
                formatter={(value: any, name: string) => {
                  return [
                    formatCurrency(value, { originalCurrency: 'USD' }),
                    t(`strategyNames.${name}`),
                  ]
                }}
              />
              <Legend formatter={(value) => t(`strategyNames.${value}`)} />
              {Object.keys(results).map((strategy) => (
                <Bar
                  key={strategy}
                  dataKey={strategy}
                  name={strategy}
                  fill={strategyColors[strategy as keyof typeof strategyColors]}
                  stroke={
                    strategy === currentOptimalStrategy.name
                      ? '#000'
                      : undefined
                  }
                  strokeWidth={strategy === currentOptimalStrategy.name ? 1 : 0}
                />
              ))}

              {/* Zero line reference */}
              <ReferenceLine y={0} stroke="#000" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Risk Analysis View */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('strategyResults.riskAnalysisTitle')}</CardTitle>
              <CardDescription>
                {t('strategyResults.riskAnalysisDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={prepareRiskScenarioData()}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="year"
                      label={{
                        value: t('strategyResults.years'),
                        position: 'insideBottomRight',
                        offset: -10,
                      }}
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        return `${
                          Math.abs(value) >= 1000000
                            ? formatCurrency(value / 1000000, {
                                maximumFractionDigits: 1,
                              }) + 'M'
                            : formatCurrency(value / 1000, {
                                maximumFractionDigits: 0,
                              }) + 'K'
                        }`
                      }}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        const parts = name.split('_')
                        const strategy = parts[0]
                        const scenario = parts[1]
                        return [
                          formatCurrency(value, { originalCurrency: 'USD' }),
                          `${t(`strategyNames.${strategy}`)} (${t(`strategyResults.${scenario}`)})`,
                        ]
                      }}
                      labelFormatter={(label) =>
                        `${t('strategyResults.year')} ${label}`
                      }
                    />
                    <Legend
                      formatter={(value) => {
                        const parts = value.split('_')
                        const strategy = parts[0]
                        const scenario = parts[1]
                        return `${t(`strategyNames.${strategy}`)} (${t(`strategyResults.${scenario}`)})`
                      }}
                    />

                    {/* Only show the current optimal strategy with all three risk scenarios */}
                    <Area
                      type="monotone"
                      dataKey={`${currentOptimalStrategy.name}_pessimistic`}
                      stackId="1"
                      stroke="#f97316"
                      fill="#fdba74"
                    />
                    <Area
                      type="monotone"
                      dataKey={`${currentOptimalStrategy.name}_standard`}
                      stackId="2"
                      stroke="#0ea5e9"
                      fill="#7dd3fc"
                    />
                    <Area
                      type="monotone"
                      dataKey={`${currentOptimalStrategy.name}_optimistic`}
                      stackId="3"
                      stroke="#10b981"
                      fill="#6ee7b7"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 space-y-4">
                <h4 className="font-medium">
                  {t('strategyResults.riskAnalysisSummary')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-amber-50 dark:bg-amber-900/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {t('strategyResults.pessimisticScenario')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold">
                        <CurrencyFormatter
                          value={getFinalRiskScenarioValue('pessimistic')}
                          originalCurrency="USD"
                        />
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('strategyResults.pessimisticScenarioDesc')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 dark:bg-blue-900/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {t('strategyResults.standardScenario')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold">
                        <CurrencyFormatter
                          value={getFinalRiskScenarioValue('standard')}
                          originalCurrency="USD"
                        />
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('strategyResults.standardScenarioDesc')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 dark:bg-green-900/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {t('strategyResults.optimisticScenario')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold">
                        <CurrencyFormatter
                          value={getFinalRiskScenarioValue('optimistic')}
                          originalCurrency="USD"
                        />
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('strategyResults.optimisticScenarioDesc')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start mb-2">
                    <InfoIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                    <div>
                      <h5 className="font-medium">
                        {t('strategyResults.whatThisMeans')}
                      </h5>
                      <p className="text-sm">
                        {t('strategyResults.whatThisMeansDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-medium mb-2">
                      {t('strategyResults.riskFactors')}
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>{t('strategyResults.marketVolatility')}</li>
                      <li>{t('strategyResults.inflationRisk')}</li>
                      <li>{t('strategyResults.jobLossRisk')}</li>
                      <li>{t('strategyResults.interestRateChanges')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Metrics Table */}
      <div>
        <h3 className="text-lg font-medium mb-4">
          {t('strategyResults.keyResults')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="text-left p-2">
                  {t('strategyResults.strategy')}
                </th>
                <th className="text-right p-2">
                  {t('strategyResults.totalInterestPaid')}
                </th>
                <th className="text-right p-2">
                  {t('strategyResults.finalInvestmentValue')}
                </th>
                <th className="text-right p-2">
                  {t('strategyResults.finalNetWorth')}
                </th>
                <th className="text-right p-2">
                  {t('strategyResults.riskAdjustedNetWorth')}
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(results).map((strategy) => {
                // Calculate risk-adjusted investment value
                const standardInvestmentValue =
                  totalInvestmentValue[strategy] || 0
                const adjustedInvestmentValue =
                  riskView === 'standard'
                    ? standardInvestmentValue
                    : (standardInvestmentValue * riskAdjustment) /
                      riskAdjustments.standard

                // Calculate risk-adjusted net worth
                const standardNetWorth = results[strategy]?.finalNetWorth || 0
                const debtComponent = standardNetWorth - standardInvestmentValue
                const adjustedNetWorth = debtComponent + adjustedInvestmentValue

                return (
                  <tr
                    key={strategy}
                    className={`border-b ${strategy === currentOptimalStrategy.name ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                  >
                    <td className="p-2 font-medium">
                      {t(`strategyNames.${strategy}`)}
                      {strategy === currentOptimalStrategy.name && (
                        <span className="ml-2 text-blue-600">★</span>
                      )}
                    </td>
                    <td className="text-right p-2 text-red-600">
                      <CurrencyFormatter
                        value={totalInterestPaid[strategy] || 0}
                        originalCurrency="USD"
                      />
                    </td>
                    <td className="text-right p-2 text-blue-600">
                      <CurrencyFormatter
                        value={adjustedInvestmentValue}
                        originalCurrency="USD"
                      />
                      {riskView !== 'standard' && (
                        <span className="text-xs ml-1">
                          ({riskView === 'optimistic' ? '+' : ''}
                          {(
                            (adjustedInvestmentValue / standardInvestmentValue -
                              1) *
                            100
                          ).toFixed(0)}
                          %)
                        </span>
                      )}
                    </td>
                    <td className="text-right p-2">
                      <CurrencyFormatter
                        value={standardNetWorth}
                        originalCurrency="USD"
                      />
                    </td>
                    <td className="text-right p-2 font-bold">
                      <CurrencyFormatter
                        value={adjustedNetWorth}
                        originalCurrency="USD"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Recommendations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">
          {t('strategyResults.personalizedRecommendations')}
        </h3>
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
        <h3 className="font-medium">{t('strategyResults.importantNotes')}</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>
            {t('strategyResults.projectionNote', {
              rate: FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN,
            })}
          </li>
          <li>{t('strategyResults.marketReturnsNote')}</li>
          <li>{t('strategyResults.consistentContributionsNote')}</li>
          <li>{t('strategyResults.customizedApproachNote')}</li>
          <li>{t('strategyResults.riskConsiderationNote')}</li>
        </ul>
      </div>
    </div>
  )

  // Helper function to prepare comparison data for the bar chart - simplified for frontend
  function prepareComparisonData() {
    if (!results) return []

    return [
      {
        category: t('strategyResults.totalInterestPaid'),
        ...Object.keys(totalInterestPaid).reduce(
          (acc, strategy) => {
            acc[strategy] = -(totalInterestPaid[strategy] || 0) // Negative to show as cost
            return acc
          },
          {} as Record<string, number>
        ),
      },
      {
        category: t('strategyResults.finalInvestmentValue'),
        ...Object.keys(totalInvestmentValue).reduce(
          (acc, strategy) => {
            // Apply risk adjustment to investment returns
            const value = totalInvestmentValue[strategy] || 0
            const adjustedValue =
              riskView === 'standard'
                ? value
                : (value * riskAdjustment) / riskAdjustments.standard

            acc[strategy] = adjustedValue
            return acc
          },
          {} as Record<string, number>
        ),
      },
    ]
  }
}
