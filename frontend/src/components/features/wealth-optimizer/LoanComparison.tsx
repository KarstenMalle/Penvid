import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LoanStrategyComparison } from './types'
import { formatCurrency, formatTimeSpan, formatPercent } from './calculations'

interface LoanComparisonProps {
  comparisons: LoanStrategyComparison[]
  spReturn: number
}

/**
 * Component to display detailed loan-by-loan comparison to make the decision clearer
 */
const LoanComparison: React.FC<LoanComparisonProps> = ({
  comparisons,
  spReturn,
}) => {
  // If no comparisons, show empty state
  if (!comparisons.length) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">
          Loan-by-Loan Strategy Breakdown
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This breakdown shows exactly what happens if you put your extra money
          toward each loan vs. investing it
        </p>
      </div>

      {comparisons.map((comparison) => (
        <Card
          key={comparison.loanId}
          className={`${comparison.payingDownIsBetter ? 'border-orange-200' : 'border-blue-200'}`}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle>{comparison.loanName}</CardTitle>
              <div
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  comparison.payingDownIsBetter
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                }`}
              >
                {comparison.payingDownIsBetter
                  ? 'Pay Down First'
                  : 'Invest Instead'}
              </div>
            </div>
            <CardDescription>
              {comparison.interestRate}% interest rate • $
              {comparison.originalBalance.toLocaleString()} balance • $
              {comparison.minimumPayment.toFixed(2)}/month minimum
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">If You Pay Minimums</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span>Monthly Payment:</span>
                      <span className="font-medium">
                        ${comparison.minimumPayment.toFixed(2)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Time to Payoff:</span>
                      <span className="font-medium">
                        {formatTimeSpan(
                          comparison.baselinePayoff.payoffTimeMonths
                        )}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Total Interest Paid:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(
                          comparison.baselinePayoff.totalInterestPaid
                        )}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Extra Money Could Earn:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(comparison.potentialInvestmentGrowth)}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">
                    If You Pay Down Aggressively
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span>Monthly Payment:</span>
                      <span className="font-medium">
                        $
                        {(
                          comparison.minimumPayment +
                          comparison.extraMonthlyPayment
                        ).toFixed(2)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Time to Payoff:</span>
                      <span className="font-medium">
                        {formatTimeSpan(
                          comparison.acceleratedPayoff.payoffTimeMonths
                        )}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Total Interest Paid:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(
                          comparison.acceleratedPayoff.totalInterestPaid
                        )}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Interest Saved:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(comparison.interestSaved)}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg ${
                  comparison.payingDownIsBetter
                    ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300'
                    : 'bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300'
                }`}
              >
                <div className="text-center mb-4">
                  <h5 className="font-bold text-lg">Financial Comparison</h5>
                  <p className="font-medium">
                    {comparison.payingDownIsBetter
                      ? `Pay down this loan first! You'll save ${formatCurrency(comparison.netAdvantage)} more than investing.`
                      : `Minimum payments only! Investing will save you ${formatCurrency(comparison.netAdvantage)} more than paying this loan early.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                    <h6 className="font-medium mb-2">
                      Strategy 1: Pay Minimums + Invest
                    </h6>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span>Total Interest Paid:</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(
                            comparison.baselinePayoff.totalInterestPaid
                          )}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Investment Growth:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(comparison.potentialInvestmentGrowth)}
                        </span>
                      </li>
                      <li className="flex justify-between border-t pt-1 mt-1">
                        <span className="font-medium">Net Cost:</span>
                        <span className="font-bold">
                          {formatCurrency(comparison.totalCostWithInvestments)}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                    <h6 className="font-medium mb-2">
                      Strategy 2: Pay Extra + No Investing
                    </h6>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span>Total Interest Paid:</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(
                            comparison.acceleratedPayoff.totalInterestPaid
                          )}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Interest Saved:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(comparison.interestSaved)}
                        </span>
                      </li>
                      <li className="flex justify-between border-t pt-1 mt-1">
                        <span className="font-medium">Net Cost:</span>
                        <span className="font-bold">
                          {formatCurrency(
                            comparison.totalCostWithAcceleratedPayments
                          )}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="text-sm mt-4">
                  <span className="font-medium">Key insight:</span>{' '}
                  {comparison.payingDownIsBetter
                    ? `This loan's ${comparison.interestRate}% interest rate is higher than the expected ${spReturn}% return from investing.`
                    : `This loan's ${comparison.interestRate}% interest rate is lower than the expected ${spReturn}% return from investing.`}{' '}
                  {comparison.payingDownIsBetter
                    ? `The interest savings from paying this loan off early exceed what you'd earn by investing.`
                    : `You'll earn more by investing than you'll save by paying this loan off early.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-4 text-sm">
        <h4 className="font-medium mb-2">How We Calculate Recommendations</h4>
        <p className="mb-3">
          We compare the total financial impact of two strategies for each loan:
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>
            <strong>Strategy 1:</strong> Pay minimum payment and invest the
            extra money at an expected {spReturn}% annual return
          </li>
          <li>
            <strong>Strategy 2:</strong> Put all your extra money toward paying
            down the loan faster
          </li>
        </ol>
        <p className="mt-3">
          For <strong>high-interest loans</strong> (above {spReturn}%), the
          interest you save by paying off early typically exceeds what you'd
          earn by investing. For <strong>low-interest loans</strong> (below{' '}
          {spReturn}%), you typically earn more by investing the money than you
          save in interest.
        </p>
        <p className="mt-3 text-gray-600 dark:text-gray-400 text-xs">
          Note: This analysis follows the "6% rule" highlighted by major
          financial institutions, which suggests prioritizing debt repayment for
          loans with interest rates above 6% while investing for loans with
          lower rates.
        </p>
      </div>
    </div>
  )
}

export default LoanComparison
