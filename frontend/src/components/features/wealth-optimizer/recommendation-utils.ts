import {
  Loan,
  Recommendation,
  StrategyResults,
  OptimalStrategy,
  STRATEGY_EXPLANATIONS,
  StrategyType,
  FINANCIAL_CONSTANTS,
  LoanStrategyComparison,
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
  optimalStrategy: OptimalStrategy,
  loanComparisons: LoanStrategyComparison[] // Include loan comparisons for better recommendations
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

  // Add loan-specific recommendations based on fair comparisons
  if (loanComparisons.length > 0) {
    // Find highest interest loan first for prioritization
    const highestInterestLoan = _.maxBy(loanComparisons, 'interestRate')

    // Find loan with the biggest advantage from paying down vs investing
    const bestLoanToPayDown = _.maxBy(
      loanComparisons.filter((loan) => loan.payingDownIsBetter),
      'netAdvantage'
    )

    // Find loan with biggest advantage from investing vs paying down
    const bestLoanToInvest = _.maxBy(
      loanComparisons.filter((loan) => !loan.payingDownIsBetter),
      'netAdvantage'
    )

    // Add specific loan recommendations if paying down is better for the loan
    if (bestLoanToPayDown) {
      recommendations.push({
        title: `Prioritize paying down your ${bestLoanToPayDown.loanName}`,
        description: `Based on your ${bestLoanToPayDown.loanName}'s ${bestLoanToPayDown.interestRate.toFixed(2)}% interest rate, paying it down early saves you more than investing would earn over the same time period. You'll be ${bestLoanToPayDown.netAdvantage.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} better off.`,
        priority: 'high',
      })
    }

    // Add recommendation for low interest loans if investing is better
    if (bestLoanToInvest) {
      recommendations.push({
        title: `Pay only minimum on your ${bestLoanToInvest.loanName}`,
        description: `With its low ${bestLoanToInvest.interestRate.toFixed(2)}% interest rate, you're better off making minimum payments on your ${bestLoanToInvest.loanName} and investing the difference. You could be ${bestLoanToInvest.netAdvantage.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} ahead by investing.`,
        priority: 'medium',
      })
    }
  }

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

  // Risk tolerance recommendation
  recommendations.push({
    title: 'Consider your personal risk tolerance',
    description:
      'While our analysis uses risk-adjusted returns to account for market volatility, your personal risk tolerance should influence your decision. If market fluctuations would cause you significant stress, prioritizing guaranteed debt reduction might be better for your peace of mind.',
    priority: 'medium',
  })

  // Very low interest rate loan recommendation
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

  // Recommendation for very high monthly available amount
  if (monthlyAvailable > totalMinimumPayment * 3) {
    recommendations.push({
      title: 'Consider diversifying investments',
      description:
        'With your substantial monthly surplus, consider splitting investments between index funds and other assets like retirement accounts (401k/IRA) to maximize tax advantages.',
      priority: 'medium',
    })
  }

  // Add fair comparison note
  recommendations.push({
    title: 'Make fair, time-based comparisons',
    description:
      'When comparing debt payoff versus investing, always compare over the same time period. Our analysis compares what happens if you invest for the same time it would take to pay off the loan with extra payments, giving you an apples-to-apples comparison.',
    priority: 'low',
  })

  return recommendations
}
