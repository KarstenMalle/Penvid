import {
  Loan,
  Recommendation,
  StrategyResults,
  OptimalStrategy,
  STRATEGY_EXPLANATIONS,
  StrategyType,
  FINANCIAL_CONSTANTS,
} from './types'
import _ from 'lodash'

const { SP500_INFLATION_ADJUSTED_RETURN } = FINANCIAL_CONSTANTS

/**
 * Generates personalized financial recommendations based on the user's specific situation
 */
export function generateRecommendations(
  loans: Loan[],
  monthlyAvailable: number,
  results: StrategyResults,
  optimalStrategy: OptimalStrategy
): Recommendation[] {
  if (!results || !optimalStrategy) return []

  const recommendations: Recommendation[] = []

  // Check if any loans have higher interest than S&P returns
  const hasHighInterestLoans = loans.some(
    (loan) => loan.interestRate > SP500_INFLATION_ADJUSTED_RETURN
  )

  // Calculate total minimum monthly payment
  const totalMinimumPayment = loans.reduce(
    (total, loan) => total + loan.minimumPayment,
    0
  )

  // Check if all loans will be paid off within 5 years under the optimal strategy
  const loansQuicklyPaidOff =
    results[optimalStrategy.name].yearlyData[5]?.loanBalance === 0

  // Generic recommendation based on optimal strategy
  recommendations.push({
    title: `Follow the "${optimalStrategy.name}" strategy`,
    description:
      STRATEGY_EXPLANATIONS[optimalStrategy.name as StrategyType] ||
      `This strategy provides the best long-term financial outcome based on your specific situation.`,
    priority: 'high',
  })

  // Specific loan-related recommendations
  if (hasHighInterestLoans) {
    recommendations.push({
      title: 'Prioritize high-interest debt',
      description: `Pay off loans with interest rates above ${SP500_INFLATION_ADJUSTED_RETURN}% before investing heavily. This gives you a guaranteed return higher than the historical inflation-adjusted stock market return.`,
      priority: 'medium',
    })
  }

  // Identify high-interest loans that should be prioritized
  const highInterestLoans = loans.filter(
    (loan) => loan.interestRate > SP500_INFLATION_ADJUSTED_RETURN
  )
  if (highInterestLoans.length > 0) {
    const loanNames = highInterestLoans.map((loan) => loan.name).join(', ')
    recommendations.push({
      title: 'Focus on these high-interest loans first',
      description: `Your ${loanNames} ${highInterestLoans.length === 1 ? 'has' : 'have'} interest rate${highInterestLoans.length === 1 ? 's' : ''} above the historical S&P 500 return. Paying ${highInterestLoans.length === 1 ? 'it' : 'them'} off first provides a guaranteed return.`,
      priority: 'medium',
    })
  }

  // Cash flow recommendation
  if (monthlyAvailable < totalMinimumPayment * 1.5) {
    recommendations.push({
      title: 'Increase your available cash flow',
      description:
        'You have limited funds available after minimum payments. Consider ways to increase your income or reduce expenses to speed up your wealth-building journey.',
      priority: 'medium',
    })
  }

  // Emergency fund recommendation
  recommendations.push({
    title: 'Build an emergency fund first',
    description:
      'Before implementing this strategy, ensure you have 3-6 months of expenses saved in an emergency fund. This provides stability and prevents new debt if unexpected expenses arise.',
    priority: 'high',
  })

  // Refinancing recommendation for high-interest loans
  const highestInterestLoan = _.maxBy(loans, 'interestRate')
  if (highestInterestLoan && highestInterestLoan.interestRate > 8) {
    recommendations.push({
      title: 'Consider refinancing high-interest debt',
      description: `Your ${highestInterestLoan.name} has a ${highestInterestLoan.interestRate}% interest rate. Refinancing to a lower rate could significantly improve your long-term results.`,
      priority: highestInterestLoan.interestRate > 10 ? 'high' : 'medium',
    })
  }

  // Goal-setting recommendation
  if (optimalStrategy.name === '5-Year Aggressive Paydown') {
    recommendations.push({
      title: 'Set a 5-year debt freedom goal',
      description:
        'Your optimal strategy involves aggressively paying down debt for 5 years. Create a specific goal with a deadline to stay motivated and track your progress regularly.',
      priority: 'medium',
    })
  }

  // Low interest rate loan recommendation
  const veryLowInterestLoans = loans.filter((loan) => loan.interestRate < 3)
  if (
    veryLowInterestLoans.length > 0 &&
    optimalStrategy.name !== 'Minimum Payments + Invest'
  ) {
    recommendations.push({
      title: 'Consider minimum payments on very low-interest loans',
      description:
        "For loans with interest rates below 3%, you might consider paying just the minimum and investing the difference, especially if you're comfortable with market risk.",
      priority: 'low',
    })
  }

  // Tax consideration recommendation
  if (
    loans.some(
      (loan) =>
        loan.name.toLowerCase().includes('student') ||
        loan.name.toLowerCase().includes('education')
    )
  ) {
    recommendations.push({
      title: 'Consider tax implications',
      description:
        'Student loan interest may be tax-deductible, which effectively lowers the true interest rate. Consult a tax professional to understand how this affects your optimal strategy.',
      priority: 'low',
    })
  }

  // Relationship between debt and investments recommendation
  if (optimalStrategy.name === 'Hybrid Approach') {
    recommendations.push({
      title: 'Balance psychological and mathematical factors',
      description:
        'While the hybrid approach mathematically optimizes your wealth, some people prefer the psychological benefit of being debt-free. Consider both factors in your decision.',
      priority: 'low',
    })
  }

  // Recommendation for very high monthly available amount
  if (monthlyAvailable > totalMinimumPayment * 3) {
    recommendations.push({
      title: 'Consider diversifying investments',
      description:
        'With your substantial monthly surplus, consider splitting investments between index funds and other assets like retirement accounts (401k/IRA) to maximize tax advantages.',
      priority: 'medium',
    })
  }

  return recommendations
}
