// frontend/src/components/features/wealth-optimizer/types.ts
/**
 * Types for the WealthOptimizer feature.
 * These types are used across the wealth optimization components.
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
 * Represents tax deduction rules for different types of loans
 * in different countries
 */
export interface TaxRules {
  isDeductible: boolean
  deductionRate?: number // e.g., 0.33 for 33% tax deduction
  maximumDeduction?: number // Maximum deductible amount
  annualDeductionCap?: number // Annual cap on deductions
}

/**
 * Country-specific tax rules for various loan types
 */
export const COUNTRY_TAX_RULES: Record<string, Record<LoanType, TaxRules>> = {
  // United States rules
  US: {
    [LoanType.MORTGAGE]: {
      isDeductible: true,
      maximumDeduction: 750000, // $750,000 mortgage debt cap for interest deduction
    },
    [LoanType.MORTGAGE_BOND]: {
      isDeductible: true,
      maximumDeduction: 750000,
    },
    [LoanType.HOME_LOAN]: {
      isDeductible: true,
      maximumDeduction: 750000,
    },
    [LoanType.STUDENT]: {
      isDeductible: true,
      annualDeductionCap: 2500, // $2,500 per year max deduction
    },
    [LoanType.AUTO]: {
      isDeductible: false,
    },
    [LoanType.CREDIT_CARD]: {
      isDeductible: false,
    },
    [LoanType.PERSONAL]: {
      isDeductible: false,
    },
    [LoanType.OTHER]: {
      isDeductible: false,
    },
  },

  // Danish rules
  DK: {
    [LoanType.MORTGAGE]: {
      isDeductible: true,
      deductionRate: 0.33, // 33% deduction rate
    },
    [LoanType.MORTGAGE_BOND]: {
      isDeductible: true,
      deductionRate: 0.33, // 33% deduction rate
    },
    [LoanType.HOME_LOAN]: {
      isDeductible: true,
      deductionRate: 0.33, // 33% deduction rate
    },
    [LoanType.STUDENT]: {
      isDeductible: true,
      deductionRate: 0.33, // 33% deduction rate
    },
    [LoanType.AUTO]: {
      isDeductible: true,
      deductionRate: 0.33, // 33% deduction rate
    },
    [LoanType.CREDIT_CARD]: {
      isDeductible: true,
      deductionRate: 0.33, // 33% deduction rate
    },
    [LoanType.PERSONAL]: {
      isDeductible: true,
      deductionRate: 0.33, // 33% deduction rate
    },
    [LoanType.OTHER]: {
      isDeductible: true,
      deductionRate: 0.33, // 33% deduction rate
    },
  },
}

/**
 * Represents a loan with all necessary details for calculations
 */
export interface Loan {
  id: number
  name: string
  balance: number
  interestRate: number
  termYears: number
  minimumPayment: number
  originalInterestRate?: number
  hasTaxAdjustment?: boolean
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

/**
 * Constants for calculations
 */
export const FINANCIAL_CONSTANTS = {
  SP500_AVERAGE_RETURN: 10.06, // Average historical return (%)
  SP500_INFLATION_ADJUSTED_RETURN: 6.78, // Inflation-adjusted return (%)
  COMPARISON_YEARS: 30, // How many years to project for comparison
}

/**
 * Calculate the effective interest rate after tax deductions
 * @param loan Loan to calculate effective rate for
 * @param countryCode Country code to use for tax rules
 * @returns Effective interest rate
 */
export function calculateEffectiveInterestRate(
  loan: Loan,
  countryCode: string = 'US'
): number {
  // Default to the original interest rate if no adjustment needed
  if (!loan.loanType || !COUNTRY_TAX_RULES[countryCode]) {
    return loan.interestRate
  }

  const taxRules = COUNTRY_TAX_RULES[countryCode][loan.loanType]

  // If not tax deductible, return original rate
  if (!taxRules.isDeductible) {
    return loan.interestRate
  }

  // Apply deduction rate if available
  if (taxRules.deductionRate) {
    return loan.interestRate * (1 - taxRules.deductionRate)
  }

  // For US-like tax systems, the impact depends on the tax bracket
  // Here we use a simplified approximation of 25% tax bracket
  return loan.interestRate * 0.75
}

/**
 * Calculate the annual tax savings from loan interest
 * @param loan Loan to calculate savings for
 * @param countryCode Country code to use for tax rules
 * @returns Annual tax savings amount
 */
export function calculateAnnualTaxSavings(
  loan: Loan,
  countryCode: string = 'US'
): number {
  if (!loan.loanType || !COUNTRY_TAX_RULES[countryCode]) {
    return 0
  }

  const taxRules = COUNTRY_TAX_RULES[countryCode][loan.loanType]

  // If not tax deductible, no savings
  if (!taxRules.isDeductible) {
    return 0
  }

  // Calculate annual interest
  const annualInterest = loan.balance * (loan.interestRate / 100)

  // Apply maximum deduction cap if applicable
  let deductibleInterest = annualInterest
  if (taxRules.maximumDeduction && loan.balance > taxRules.maximumDeduction) {
    deductibleInterest = taxRules.maximumDeduction * (loan.interestRate / 100)
  }

  // Apply annual deduction cap if applicable
  if (
    taxRules.annualDeductionCap &&
    deductibleInterest > taxRules.annualDeductionCap
  ) {
    deductibleInterest = taxRules.annualDeductionCap
  }

  // Calculate tax savings
  if (taxRules.deductionRate) {
    // Direct deduction rate (e.g., Danish system)
    return deductibleInterest * taxRules.deductionRate
  } else {
    // Tax bracket based (e.g., US system)
    // Assuming 25% average tax bracket
    return deductibleInterest * 0.25
  }
}

/**
 * Get the tax rules for a loan based on its type and country
 * @param loan The loan to get tax rules for
 * @param countryCode Country code to use for tax rules
 * @returns The applicable tax rules or undefined if none found
 */
export function getLoanTaxRules(
  loan: Loan,
  countryCode: string = 'US'
): TaxRules | undefined {
  if (!loan.loanType || !COUNTRY_TAX_RULES[countryCode]) {
    return undefined
  }

  return COUNTRY_TAX_RULES[countryCode][loan.loanType]
}

/**
 * Check if a loan is tax-deductible based on its type and country
 * @param loan The loan to check
 * @param countryCode Country code to use for tax rules
 * @returns True if the loan is tax-deductible
 */
export function isLoanTaxDeductible(
  loan: Loan,
  countryCode: string = 'US'
): boolean {
  const taxRules = getLoanTaxRules(loan, countryCode)
  return taxRules ? taxRules.isDeductible : false
}

/**
 * Calculate the weighted average interest rate for multiple loans
 * @param loans Array of loans
 * @param useEffectiveRate Whether to use the effective (tax-adjusted) rate
 * @param countryCode Country code to use for tax calculations
 * @returns Weighted average interest rate
 */
export function calculateWeightedAverageInterestRate(
  loans: Loan[],
  useEffectiveRate: boolean = false,
  countryCode: string = 'US'
): number {
  if (loans.length === 0) return 0

  let totalBalance = 0
  let weightedSum = 0

  loans.forEach((loan) => {
    totalBalance += loan.balance

    // Use effective rate if requested and available
    const rate = useEffectiveRate
      ? loan.effectiveInterestRate ||
        calculateEffectiveInterestRate(loan, countryCode)
      : loan.interestRate

    weightedSum += loan.balance * rate
  })

  return totalBalance > 0 ? weightedSum / totalBalance : 0
}

/**
 * Group loans by whether they are above or below the S&P 500 return threshold
 * based on their effective (tax-adjusted) interest rates
 * @param loans Array of loans
 * @param countryCode Country code to use for tax calculations
 * @returns Object with high and low interest loan arrays
 */
export function groupLoansByEffectiveRate(
  loans: Loan[],
  countryCode: string = 'US'
): { highInterestLoans: Loan[]; lowInterestLoans: Loan[] } {
  const highInterestLoans: Loan[] = []
  const lowInterestLoans: Loan[] = []

  loans.forEach((loan) => {
    // Calculate or use cached effective rate
    const effectiveRate =
      loan.effectiveInterestRate ||
      calculateEffectiveInterestRate(loan, countryCode)

    // Add to appropriate array
    if (effectiveRate > FINANCIAL_CONSTANTS.SP500_INFLATION_ADJUSTED_RETURN) {
      // Create a copy with the effective rate included
      highInterestLoans.push({
        ...loan,
        effectiveInterestRate: effectiveRate,
      })
    } else {
      lowInterestLoans.push({
        ...loan,
        effectiveInterestRate: effectiveRate,
      })
    }
  })

  return { highInterestLoans, lowInterestLoans }
}

/**
 * Calculates the optimal strategy considering tax implications
 * @param loans Array of loans
 * @param monthlyAvailable Monthly available money
 * @param countryCode Country code to use for tax calculations
 * @returns The updated loans with tax-adjusted interest rates and optimal strategy information
 */
export function calculateTaxAdjustedStrategy(
  loans: Loan[],
  monthlyAvailable: number,
  countryCode: string = 'US'
): {
  taxAdjustedLoans: Loan[]
  highInterestLoans: Loan[]
  lowInterestLoans: Loan[]
} {
  // Calculate effective rates for all loans
  const taxAdjustedLoans = loans.map((loan) => {
    const effectiveRate = calculateEffectiveInterestRate(loan, countryCode)

    // Return a new loan with the calculated effective rate
    return {
      ...loan,
      effectiveInterestRate: effectiveRate,
      originalInterestRate: loan.interestRate,
      hasTaxAdjustment: effectiveRate !== loan.interestRate,
      countryCode,
    }
  })

  // Group by effective rate
  const { highInterestLoans, lowInterestLoans } = groupLoansByEffectiveRate(
    taxAdjustedLoans,
    countryCode
  )

  return {
    taxAdjustedLoans,
    highInterestLoans,
    lowInterestLoans,
  }
}
