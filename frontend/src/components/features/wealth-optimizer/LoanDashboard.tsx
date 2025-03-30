import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatTimeSpan, formatPercent } from './calculations'
import { Loan, LoanStrategyComparison, FINANCIAL_CONSTANTS } from './types'
import { PaymentRecord } from './MonthlyProgressTracker'
import {
  CircleCheck,
  CircleDollarSign,
  TrendingUp,
  BarChart4,
  Calendar,
  ArrowDownUp,
  PiggyBank,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface LoanDashboardProps {
  loans: Loan[]
  monthlyBudget: number
  paymentHistory: PaymentRecord[]
  loanComparisons: LoanStrategyComparison[]
  netWorthData: any[]
  onRefreshStrategy: () => void
}

const LoanDashboard: React.FC<LoanDashboardProps> = ({
  loans,
  monthlyBudget,
  paymentHistory,
  loanComparisons,
  netWorthData,
  onRefreshStrategy,
}) => {
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate total balance across all loans
  const totalCurrentBalance = loans.reduce((sum, loan) => sum + loan.balance, 0)

  // Calculate total original balance based on payment history
  const loanPayments = loans.map((loan) => {
    const payments = paymentHistory.filter((p) => p.loanId === loan.id)
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const originalBalance = loan.balance + totalPaid
    return {
      ...loan,
      originalBalance,
      totalPaid,
      percentagePaid:
        originalBalance > 0 ? (totalPaid / originalBalance) * 100 : 0,
    }
  })

  const totalOriginalBalance = loanPayments.reduce(
    (sum, loan) => sum + loan.originalBalance,
    0
  )
  const totalPaid = loanPayments.reduce((sum, loan) => sum + loan.totalPaid, 0)

  // Calculate overall debt freedom progress
  const overallProgress =
    totalOriginalBalance > 0
      ? Math.min(100, (totalPaid / totalOriginalBalance) * 100)
      : 0

  // Calculate monthly interest and principal
  const monthlyInterest = loans.reduce((sum, loan) => {
    const monthlyRate = loan.interestRate / 100 / 12
    return sum + loan.balance * monthlyRate
  }, 0)

  const monthlyPrincipal =
    loans.reduce((sum, loan) => sum + loan.minimumPayment, 0) - monthlyInterest

  // Calculate debt-to-income ratio (using monthly budget as proxy for income)
  const debtToIncomeRatio =
    monthlyBudget > 0
      ? (loans.reduce((sum, loan) => sum + loan.minimumPayment, 0) /
          monthlyBudget) *
        100
      : 0

  // Determine strategy allocation
  const highInterestLoans = loans.filter(
    (loan) =>
      loan.interestRate > FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN
  )

  const lowInterestLoans = loans.filter(
    (loan) =>
      loan.interestRate <= FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN
  )

  const remainingAfterMinimums =
    monthlyBudget - loans.reduce((sum, loan) => sum + loan.minimumPayment, 0)

  // Prepare data for pie chart
  const balanceByInterestRate = [
    {
      name: 'High Interest Debt',
      value: highInterestLoans.reduce((sum, loan) => sum + loan.balance, 0),
      color: '#ef4444',
    },
    {
      name: 'Low Interest Debt',
      value: lowInterestLoans.reduce((sum, loan) => sum + loan.balance, 0),
      color: '#3b82f6',
    },
  ].filter((item) => item.value > 0)

  // Calculate total payments by month for history chart
  const getPaymentsByMonth = () => {
    const paymentsByMonth: Record<
      string,
      {
        month: string
        principal: number
        interest: number
        extra: number
      }
    > = {}

    // Get last 12 months of payments
    const today = new Date()
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      return d.toISOString().slice(0, 7) // YYYY-MM format
    }).reverse()

    // Initialize months
    last12Months.forEach((month) => {
      paymentsByMonth[month] = {
        month,
        principal: 0,
        interest: 0,
        extra: 0,
      }
    })

    // Sum payments by month
    paymentHistory.forEach((payment) => {
      const month = payment.date.slice(0, 7)
      if (paymentsByMonth[month]) {
        if (payment.isExtraPayment) {
          paymentsByMonth[month].extra += payment.amount
        } else {
          // Estimate principal vs interest based on loan details
          const loan = loans.find((l) => l.id === payment.loanId)
          if (loan) {
            const monthlyRate = loan.interestRate / 100 / 12
            const estimatedInterest = loan.balance * monthlyRate
            const estimatedPrincipal = payment.amount - estimatedInterest

            paymentsByMonth[month].principal += Math.max(0, estimatedPrincipal)
            paymentsByMonth[month].interest += Math.min(
              payment.amount,
              estimatedInterest
            )
          }
        }
      }
    })

    return Object.values(paymentsByMonth)
  }

  const paymentHistoryData = getPaymentsByMonth()

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overall Progress</TabsTrigger>
          <TabsTrigger value="loans">Loan Details</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Tracker</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Progress Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <CircleCheck className="mr-2 h-5 w-5 text-green-500" />
                Debt Freedom Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span className="font-medium">
                    {overallProgress.toFixed(1)}% Complete
                  </span>
                </div>
                <Progress value={overallProgress} className="h-3" />

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm text-gray-500">Original Balance</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(totalOriginalBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Paid So Far</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Balance</p>
                    <p className="text-xl font-bold text-amber-600">
                      {formatCurrency(totalCurrentBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(
                        Math.max(0, totalOriginalBalance - totalPaid)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Health Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <CircleDollarSign className="mr-2 h-5 w-5 text-blue-500" />
                  Monthly Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(monthlyPrincipal + monthlyInterest)}
                </p>
                <div className="text-sm mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Principal:</span>
                    <span>{formatCurrency(monthlyPrincipal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Interest:</span>
                    <span>{formatCurrency(monthlyInterest)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <BarChart4 className="mr-2 h-5 w-5 text-indigo-500" />
                  Debt-to-Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {debtToIncomeRatio.toFixed(1)}%
                </p>
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        debtToIncomeRatio > 36
                          ? 'bg-red-500'
                          : debtToIncomeRatio > 28
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(100, debtToIncomeRatio * 2)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs mt-1 text-gray-500">
                    {debtToIncomeRatio > 36
                      ? 'High: Consider reducing debt'
                      : debtToIncomeRatio > 28
                        ? 'Moderate: Watch your ratio'
                        : 'Good: Healthy debt level'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-purple-500" />
                  Estimated Freedom
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loans.length > 0 ? (
                  <>
                    <p className="text-xl font-bold">
                      {new Date(
                        new Date().setMonth(
                          new Date().getMonth() +
                            Math.ceil(totalCurrentBalance / monthlyPrincipal)
                        )
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-sm mt-1 text-gray-500">
                      Approximately{' '}
                      {Math.ceil(totalCurrentBalance / monthlyPrincipal)} months
                      at current rate
                    </p>
                  </>
                ) : (
                  <p className="text-xl font-bold text-green-600">Debt Free!</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment History Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                Payment History
              </CardTitle>
              <CardDescription>
                Your monthly payment breakdown over the last 12 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={paymentHistoryData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })
                      }}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      labelFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="principal"
                      name="Principal"
                      stroke="#3b82f6"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="interest"
                      name="Interest"
                      stroke="#ef4444"
                    />
                    <Line
                      type="monotone"
                      dataKey="extra"
                      name="Extra Payments"
                      stroke="#10b981"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans" className="space-y-6">
          {/* Debt Composition */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Loan Details</CardTitle>
                <CardDescription>
                  Breakdown of your current loans by balance and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {loanPayments.map((loan) => (
                    <div key={loan.id} className="space-y-2">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{loan.name}</h4>
                          <p className="text-sm text-gray-500">
                            {loan.interestRate}% interest • $
                            {loan.minimumPayment}/month minimum
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {formatCurrency(loan.balance)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {loan.percentagePaid.toFixed(1)}% paid off
                          </p>
                        </div>
                      </div>

                      <Progress value={loan.percentagePaid} className="h-2" />

                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          Original: {formatCurrency(loan.originalBalance)}
                        </span>
                        <span>Paid: {formatCurrency(loan.totalPaid)}</span>
                        <span>Remaining: {formatCurrency(loan.balance)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Debt Composition</CardTitle>
                <CardDescription>Breakdown by interest rate</CardDescription>
              </CardHeader>
              <CardContent>
                {balanceByInterestRate.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={balanceByInterestRate}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {balanceByInterestRate.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500">No active loans</p>
                  </div>
                )}

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>
                      High Interest: Above{' '}
                      {FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}%
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span>
                      Low Interest: Below{' '}
                      {FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interest Paid Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Interest Analysis</CardTitle>
              <CardDescription>
                How much of your payments are going to interest versus principal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Monthly Breakdown</h4>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                          Principal
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-blue-600">
                          {monthlyPrincipal > 0
                            ? (
                                (monthlyPrincipal /
                                  (monthlyPrincipal + monthlyInterest)) *
                                100
                              ).toFixed(0)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200">
                      <div
                        style={{
                          width: `${monthlyPrincipal > 0 ? (monthlyPrincipal / (monthlyPrincipal + monthlyInterest)) * 100 : 0}%`,
                        }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                      ></div>
                    </div>
                  </div>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">
                          Interest
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-red-600">
                          {monthlyInterest > 0
                            ? (
                                (monthlyInterest /
                                  (monthlyPrincipal + monthlyInterest)) *
                                100
                              ).toFixed(0)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200">
                      <div
                        style={{
                          width: `${monthlyInterest > 0 ? (monthlyInterest / (monthlyPrincipal + monthlyInterest)) * 100 : 0}%`,
                        }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm">
                    <p>
                      Every month,{' '}
                      <span className="font-bold text-red-600">
                        {formatCurrency(monthlyInterest)}
                      </span>{' '}
                      of your payment goes to interest.
                    </p>
                    <p className="mt-1">
                      That's{' '}
                      <span className="font-bold text-red-600">
                        {formatCurrency(monthlyInterest * 12)}
                      </span>{' '}
                      per year that could be going toward your financial goals.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Interest by Loan</h4>
                  <div className="space-y-3">
                    {loans.map((loan) => {
                      const monthlyRate = loan.interestRate / 100 / 12
                      const monthlyInterestAmount = loan.balance * monthlyRate
                      return (
                        <div key={loan.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{loan.name}</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(monthlyInterestAmount)}/month
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{
                                width: `${(monthlyInterestAmount / loan.minimumPayment) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {(
                              (monthlyInterestAmount / loan.minimumPayment) *
                              100
                            ).toFixed(1)}
                            % of your payment is interest
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-6">
          {/* Strategy Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowDownUp className="mr-2 h-5 w-5 text-purple-500" />
                Current Strategy
              </CardTitle>
              <CardDescription>
                Your optimal debt payoff and investment strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {highInterestLoans.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200">
                    <h4 className="font-medium text-amber-800 dark:text-amber-400 flex items-center">
                      <CircleDollarSign className="mr-2 h-5 w-5" />
                      High Priority: Pay Down These Loans First
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      These loans have interest rates above{' '}
                      {FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}%,
                      which is higher than the expected return from investing.
                    </p>

                    <div className="mt-3 space-y-3">
                      {highInterestLoans.map((loan) => (
                        <div
                          key={loan.id}
                          className="bg-white dark:bg-gray-800 p-3 rounded border border-amber-100 dark:border-amber-900/20"
                        >
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium">{loan.name}</h5>
                              <p className="text-sm text-gray-500">
                                {loan.interestRate}% interest rate
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                {formatCurrency(loan.balance)}
                              </p>
                              <p className="text-sm text-amber-600 dark:text-amber-400">
                                Min: ${loan.minimumPayment}/month
                              </p>
                            </div>
                          </div>

                          {remainingAfterMinimums > 0 && (
                            <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-sm">
                              <p className="font-medium text-amber-800 dark:text-amber-400">
                                Recommendation: Add $
                                {Math.min(
                                  remainingAfterMinimums,
                                  loan.balance
                                ).toFixed(0)}
                                /month extra
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lowInterestLoans.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 dark:text-blue-400 flex items-center">
                      <PiggyBank className="mr-2 h-5 w-5" />
                      Low Priority: Just Pay Minimums on These
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      These loans have interest rates below{' '}
                      {FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}%.
                      You'll likely earn more by investing extra money than
                      paying these off early.
                    </p>

                    <div className="mt-3 space-y-3">
                      {lowInterestLoans.map((loan) => (
                        <div
                          key={loan.id}
                          className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-100 dark:border-blue-900/20"
                        >
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium">{loan.name}</h5>
                              <p className="text-sm text-gray-500">
                                {loan.interestRate}% interest rate
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                {formatCurrency(loan.balance)}
                              </p>
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                Min: ${loan.minimumPayment}/month
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm">
                            <p className="font-medium text-blue-800 dark:text-blue-400">
                              Recommendation: Just pay the minimum
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {remainingAfterMinimums > 0 &&
                  highInterestLoans.length === 0 && (
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 dark:text-green-400 flex items-center">
                        <TrendingUp className="mr-2 h-5 w-5" />
                        Invest Your Extra Money
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Since all your loans have interest rates below{' '}
                        {FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}%,
                        you should consider investing your extra $
                        {remainingAfterMinimums.toFixed(0)}/month.
                      </p>

                      <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded border border-green-100 dark:border-green-900/20">
                        <p>
                          With a{' '}
                          {FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN}%
                          annual return, your monthly investment of $
                          {remainingAfterMinimums.toFixed(0)} could grow to:
                        </p>

                        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <p className="text-xs text-gray-500">5 Years</p>
                            <p className="font-bold text-green-600">
                              {formatCurrency(
                                remainingAfterMinimums * 12 * 5 * 1.4
                              )}
                            </p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <p className="text-xs text-gray-500">10 Years</p>
                            <p className="font-bold text-green-600">
                              {formatCurrency(
                                remainingAfterMinimums * 12 * 10 * 1.95
                              )}
                            </p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <p className="text-xs text-gray-500">20 Years</p>
                            <p className="font-bold text-green-600">
                              {formatCurrency(
                                remainingAfterMinimums * 12 * 20 * 3.8
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={onRefreshStrategy} className="w-full">
                Recalculate Optimal Strategy
              </Button>
            </CardFooter>
          </Card>

          {/* Net Worth Projections */}
          <Card>
            <CardHeader>
              <CardTitle>Long-Term Net Worth Projections</CardTitle>
              <CardDescription>
                Your projected financial growth based on current strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={netWorthData}
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
                        `${Math.abs(value) >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : (value / 1000).toFixed(0) + 'K'}`
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
                    <Line
                      type="monotone"
                      dataKey="netWorth"
                      name="Net Worth"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="investments"
                      name="Investments"
                      stroke="#3b82f6"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="debt"
                      name="Debt"
                      stroke="#ef4444"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Special Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Milestones</CardTitle>
              <CardDescription>
                Key dates in your journey to financial freedom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Debt Free Milestone */}
                <div className="flex">
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CircleCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="font-medium">Debt Free</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(
                        new Date().setMonth(
                          new Date().getMonth() +
                            Math.ceil(totalCurrentBalance / monthlyPrincipal)
                        )
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-xs mt-1">
                      {Math.ceil(totalCurrentBalance / monthlyPrincipal)} months
                      at current payment rate
                    </p>
                  </div>
                </div>

                {/* High Interest Debt Free */}
                {highInterestLoans.length > 0 && (
                  <div className="flex">
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                      <CircleDollarSign className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium">High Interest Debt Free</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(
                          new Date().setMonth(
                            new Date().getMonth() +
                              Math.ceil(
                                highInterestLoans.reduce(
                                  (sum, loan) => sum + loan.balance,
                                  0
                                ) /
                                  (highInterestLoans.reduce(
                                    (sum, loan) => sum + loan.minimumPayment,
                                    0
                                  ) +
                                    remainingAfterMinimums)
                              )
                          )
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      <p className="text-xs mt-1">
                        Focus on eliminating these loans first to save on
                        interest
                      </p>
                    </div>
                  </div>
                )}

                {/* Investment Milestone */}
                {remainingAfterMinimums > 0 && (
                  <div className="flex">
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <PiggyBank className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium">$100,000 in Investments</h4>
                      <p className="text-sm text-gray-500">
                        Approximately{' '}
                        {Math.ceil(
                          100000 / (remainingAfterMinimums * 12 * 1.07)
                        )}{' '}
                        years
                      </p>
                      <p className="text-xs mt-1">
                        Based on investing ${remainingAfterMinimums}/month after
                        high-interest debt is paid off
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LoanDashboard
