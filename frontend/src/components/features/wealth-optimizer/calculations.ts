// frontend/src/components/features/wealth-optimizer/calculations.ts (Updated)

import {
  Loan,
  YearlyData,
  StrategyResult,
  StrategyResults,
  OptimalStrategy,
  LoanStrategyComparison,
} from './types'
import { FinancialApiService } from '@/services/FinancialApiService'

/**
 * Format percentage for display
 */
export const formatPercent = (percent: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100)
}

/**
 * Format years and months for display
 */
export const formatTimeSpan = (
  months: number,
  locale: string = 'en'
): string => {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (locale === 'da') {
    if (years === 0) {
      return `${remainingMonths} måned${remainingMonths !== 1 ? 'er' : ''}`
    } else if (remainingMonths === 0) {
      return `${years} år`
    } else {
      return `${years} år og ${remainingMonths} måned${remainingMonths !== 1 ? 'er' : ''}`
    }
  } else {
    // Default English format
    if (years === 0) {
      return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
    } else if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`
    } else {
      return `${years} year${years !== 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
    }
  }
}

/**
 * Calculate loan amortization using the backend API
 */
export const calculateAmortization = async (
  userId: string,
  loanId: number,
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  extraPayment: number = 0,
  currency: string = 'USD'
) => {
  try {
    return await FinancialApiService.getAmortizationSchedule(
      userId,
      loanId,
      principal,
      annualRate / 100, // Convert percentage to decimal
      monthlyPayment,
      extraPayment,
      currency as any
    )
  } catch (error) {
    console.error('Error calculating amortization:', error)
    throw error
  }
}

/**
 * Calculate investment growth using the backend API
 */
export const calculateInvestmentGrowth = async (
  monthlyAmount: number,
  annualReturn: number,
  months: number,
  inflationRate: number = 0.025,
  riskFactor: number = 0.2,
  currency: string = 'USD'
) => {
  try {
    return await FinancialApiService.getInvestmentProjection(
      monthlyAmount,
      annualReturn / 100, // Convert percentage to decimal
      months,
      inflationRate,
      riskFactor,
      currency as any
    )
  } catch (error) {
    console.error('Error calculating investment growth:', error)
    throw error
  }
}

/**
 * Calculates all strategies and determines the optimal one using the backend API
 */
export const calculateAllStrategies = async (
  userId: string,
  loans: Loan[],
  monthlyAvailable: number,
  annualInvestmentReturn: number = 0.07,
  inflationRate: number = 0.025,
  riskFactor: number = 0.2,
  currency: string = 'USD'
): Promise<{
  strategies: any
  optimal: OptimalStrategy
  loanComparisons: LoanStrategyComparison[]
}> => {
  try {
    // Call the backend API
    const result = await FinancialApiService.getFinancialStrategy(
      userId,
      loans,
      monthlyAvailable,
      annualInvestmentReturn,
      inflationRate,
      riskFactor,
      currency as any
    )

    // Format the results to match the expected interface
    const optimal: OptimalStrategy = {
      name: result.recommendation.best_strategy,
      description: result.recommendation.reason,
      netWorthDifference: {}, // Would need to be populated from the API results
    }

    // This is a simplified version - the actual implementation would need to map
    // the API response to match the expected format of StrategyResults

    return {
      strategies: result,
      optimal,
      loanComparisons: [], // Would need to be populated from the API results
    }
  } catch (error) {
    console.error('Error calculating strategies:', error)
    throw error
  }
}
