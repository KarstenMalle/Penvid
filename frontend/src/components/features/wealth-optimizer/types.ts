// frontend/src/components/features/wealth-optimizer/types.ts
/**
 * Types for the WealthOptimizer feature.
 * These types are used across the wealth optimization components.
 * Calculation logic has been moved to the backend.
 */

/**
 * Enum representing different types of loans
 */
export enum LoanType {
  MORTGAGE = 'MORTGAGE', // General mortgage (for US, UK, etc.)
  MORTGAGE_BOND = 'MORTGAGE_BOND', // Danish realkreditlån
  HOME_LOAN = 'HOME_LOAN', // Danish boliglån
  STUDENT = 'STUDENT',
  AUTO = 'AUTO',
  CREDIT_CARD = 'CREDIT_CARD',
  PERSONAL = 'PERSONAL',
  OTHER = 'OTHER',
}

/**
 * Enum representing loan priority levels
 */
export enum LoanPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Constants for calculations (retained for reference)
 */
export const FINANCIAL_CONSTANTS = {
  SP500_AVERAGE_RETURN: 10.06, // Average historical return (%)
  SP500_INFLATION_ADJUSTED_RETURN: 6.78, // Inflation-adjusted return (%)
  COMPARISON_YEARS: 30, // How many years to project for comparison
}

/**
 * Represents a loan with all necessary details for the UI
 */
export interface Loan {
  id: number
  name: string
  balance: number
  interestRate: number
  termYears: number
  minimumPayment: number
  originalInterestRate?: number
  effectiveInterestRate?: number // Adjusted rate after tax deductions
  loanType?: LoanType
  priority?: LoanPriority
  countryCode?: string // Which country's tax rules apply to this loan
}

/**
 * Yearly data point for financial projections
 */
export interface YearlyData {
  year: number
  investmentValue: number
  loanBalance: number
  netWorth: number
}

/**
 * Investment detail for tracking growth
 */
export interface InvestmentDetail {
  year: number
  amount: number
  totalValue: number
}

/**
 * Detailed information about loan payoff
 */
export interface PayoffDetail {
  loanId: number
  loanName: string
  payoffTimeMonths: number
  payoffTimeYears: number
  totalInterestPaid: number
  totalPaid: number
  monthlyPayment: number
  originalLoanAmount: number
}

/**
 * Collection of loan payoff details by loan ID
 */
export interface LoanPayoffDetails {
  [loanId: number]: PayoffDetail
}

/**
 * Comparison of paying down a loan vs investing
 */
export interface LoanStrategyComparison {
  loanId: number
  loanName: string
  interestRate: number
  effectiveInterestRate?: number
  originalBalance: number
  minimumPayment: number
  baselinePayoff: PayoffDetail
  acceleratedPayoff: PayoffDetail
  extraMonthlyPayment: number
  interestSaved: number
  potentialInvestmentGrowth: number // Short-term for fair comparison
  longTermInvestmentGrowth: number // Full term growth
  acceleratedStrategyTotalValue: number // Total growth if investing after loan paid off
  payingDownIsBetter: boolean
  netAdvantage: number
  betterStrategy: string
  totalCostWithInvestments?: number
  totalCostWithAcceleratedPayments?: number
  // Added for full term comparison
  fullTermComparison: {
    investingOnlyNetWorth: number
    acceleratedStrategyNetWorth: number
    isBetter: boolean
  }
}

/**
 * Results of a specific financial strategy
 */
export interface StrategyResult {
  yearlyData: YearlyData[]
  finalNetWorth: number
  totalInterestPaid: number
  loanPayoffDetails: LoanPayoffDetails
  investmentDetails: InvestmentDetail[]
  strategyName: string
  strategyDescription: string
}

/**
 * Collection of all strategy results
 */
export interface StrategyResults {
  [strategyName: string]: StrategyResult
}

/**
 * Information about the optimal strategy
 */
export interface OptimalStrategy {
  name: string
  description: string
  netWorthDifference: {
    [strategyName: string]: number
  }
}

/**
 * Personalized financial recommendation
 */
export interface Recommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

/**
 * Financial strategy types with explanations
 */
export enum StrategyType {
  MINIMUM_INVEST = 'Minimum Payments + Invest',
  DEBT_AVALANCHE = 'Debt Avalanche',
  HYBRID = 'Hybrid Approach',
  AGGRESSIVE_THEN_INVEST = '5-Year Aggressive Paydown',
}

/**
 * Strategy explanations for consistent messaging
 */
export const STRATEGY_EXPLANATIONS: Record<StrategyType, string> = {
  [StrategyType.MINIMUM_INVEST]:
    'Pay only the minimum required payments on all loans and invest the rest in the S&P 500.',
  [StrategyType.DEBT_AVALANCHE]:
    'Pay minimum on all loans, but put any extra money toward the highest interest loan first. Once paid off, move to the next highest interest loan. Invest only after all loans are paid off.',
  [StrategyType.HYBRID]:
    "Pay off only loans with interest rates higher than the S&P 500's inflation-adjusted return, and invest the rest.",
  [StrategyType.AGGRESSIVE_THEN_INVEST]:
    'Aggressively pay down all loans for the first 5 years (focusing on high-interest loans first), then switch to investing all extra money after that.',
}
