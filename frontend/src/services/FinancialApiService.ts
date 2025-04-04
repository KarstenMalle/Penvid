// frontend/src/services/FinancialApiService.ts - Improved with ApiClient

import { Loan } from '@/components/features/wealth-optimizer/types'
import { Currency } from '@/i18n/config'
import { ApiClient } from './ApiClient'

export interface UserSettings {
  expected_inflation: number
  expected_investment_return: number
  risk_tolerance: number
}

export interface InvestmentEntry {
  month: number
  date: string
  balance: number
  inflation_adjusted_balance: number
  risk_adjusted_balance: number
}

export interface YearlyDataPoint {
  year: number
  netWorth: number
  investmentValue: number
  debtValue: number
}

export interface StrategyResultData {
  yearlyData: YearlyDataPoint[]
  finalNetWorth: number
  totalInterestPaid: number
  loanPayoffDetails: Record<string, any>
  investmentDetails: any[]
  strategyName: string
  strategyDescription: string
}

export interface RiskScenario {
  name: string // 'pessimistic', 'standard', or 'optimistic'
  yearlyData: YearlyDataPoint[]
  finalNetWorth: number
  finalInvestmentValue: number
  finalDebtValue: number
  riskAdjustmentFactor: number
}

export interface StrategyRiskAnalysis {
  strategyName: string
  scenarios: {
    pessimistic: RiskScenario
    standard: RiskScenario
    optimistic: RiskScenario
  }
  comparisonData: any[] // Pre-formatted data for charts
}

export interface FinancialStrategyResponse {
  recommendation: {
    name: string
    description: string
    netWorthDifference: Record<string, number>
  }
  results: Record<string, StrategyResultData>
  yearByYearData: YearlyDataPoint[]
  totalInterestPaid: Record<string, number>
  totalInvestmentValue: Record<string, number>
  loanComparisons: any[]
  riskAnalysis?: Record<string, StrategyRiskAnalysis> // Added for risk analysis
}

/**
 * Service for financial calculations via backend API
 */
export const FinancialApiService = {
  /**
   * Get user financial settings
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    const response = await ApiClient.get<UserSettings>(
      `/api/user/${userId}/settings`,
      {
        requiresAuth: true,
        cache: {
          enabled: true,
          ttl: 1000 * 60 * 5, // 5 minutes
        },
        requestId: 'get-user-settings',
      }
    )

    if (response.error || !response.data) {
      // Return default settings on error
      return {
        expected_inflation: 0.025,
        expected_investment_return: 0.07,
        risk_tolerance: 0.2,
      }
    }

    return response.data
  },

  /**
   * Update user financial settings
   */
  async updateUserSettings(
    userId: string,
    settings: UserSettings
  ): Promise<UserSettings> {
    const response = await ApiClient.post<UserSettings, UserSettings>(
      `/api/user/${userId}/settings`,
      settings,
      {
        requiresAuth: true,
        invalidateCache: `/api/user/${userId}/settings`,
        requestId: 'update-user-settings',
      }
    )

    if (response.error) {
      throw new Error(response.error.message || 'Failed to update settings')
    }

    return response.data || settings
  },

  /**
   * Get investment projection
   */
  async getInvestmentProjection(
    monthlyAmount: number,
    annualReturn: number,
    months: number,
    inflationRate: number = 0.025,
    riskFactor: number = 0.2,
    currency: Currency = 'USD'
  ): Promise<{
    projection: InvestmentEntry[]
    final_balance: number
    inflation_adjusted_final_balance: number
    risk_adjusted_balance: number
  }> {
    const response = await ApiClient.post<any, any>(
      `/api/investment/projection`,
      {
        monthly_amount: monthlyAmount,
        annual_return: annualReturn,
        months,
        inflation_rate: inflationRate,
        risk_factor: riskFactor,
        currency,
      },
      {
        requiresAuth: true,
        requestId: 'investment-projection',
      }
    )

    if (response.error || !response.data) {
      // Create simple fallback projection
      const fallbackProjection: InvestmentEntry[] = []
      let balance = 0

      for (let month = 1; month <= months; month++) {
        // Simple interest calculation (not compound)
        const monthlyRate = annualReturn / 12
        balance += monthlyAmount
        balance *= 1 + monthlyRate

        const date = new Date()
        date.setMonth(date.getMonth() + month)

        fallbackProjection.push({
          month,
          date: date.toISOString().slice(0, 10),
          balance,
          inflation_adjusted_balance:
            balance / Math.pow(1 + inflationRate / 12, month),
          risk_adjusted_balance: balance * (1 - riskFactor),
        })
      }

      return {
        projection: fallbackProjection,
        final_balance: balance,
        inflation_adjusted_final_balance:
          balance / Math.pow(1 + inflationRate / 12, months),
        risk_adjusted_balance: balance * (1 - riskFactor),
      }
    }

    return response.data
  },

  /**
   * Calculate optimal financial strategy
   */
  async getFinancialStrategy(
    userId: string,
    loans: Loan[],
    monthlyBudget: number,
    annualInvestmentReturn: number = 0.07,
    inflationRate: number = 0.025,
    riskFactor: number = 0.2,
    currency: Currency = 'USD'
  ): Promise<FinancialStrategyResponse> {
    // Convert loan format for API compatibility
    const apiFormattedLoans = loans.map((loan) => ({
      loan_id: loan.id,
      name: loan.name,
      balance: loan.balance,
      interest_rate: loan.interestRate,
      term_years: loan.termYears,
      minimum_payment: loan.minimumPayment,
      loan_type: loan.loanType || 'OTHER',
    }))

    const response = await ApiClient.post<any, any>(
      `/api/user/${userId}/financial-strategy`,
      {
        loans: apiFormattedLoans,
        monthly_surplus: monthlyBudget,
        annual_investment_return: annualInvestmentReturn,
        inflation_rate: inflationRate,
        risk_factor: riskFactor,
        currency,
        include_risk_analysis: true, // Request risk analysis data
      },
      {
        requiresAuth: true,
        requestId: 'financial-strategy',
        // Cache this - calculations are expensive
        invalidateCache: `/api/user/${userId}/financial-strategy`,
      }
    )

    if (response.error || !response.data) {
      // Create minimal fallback response
      const defaultStrategy = 'Hybrid Approach'
      const fallbackResponse: FinancialStrategyResponse = {
        recommendation: {
          name: defaultStrategy,
          description:
            'This strategy provides a balance between paying off high-interest debt and investing for the future.',
          netWorthDifference: {},
        },
        results: {
          [defaultStrategy]: {
            yearlyData: [],
            finalNetWorth: 0,
            totalInterestPaid: 0,
            loanPayoffDetails: {},
            investmentDetails: [],
            strategyName: defaultStrategy,
            strategyDescription:
              'Pay off high-interest loans first and invest the rest.',
          },
        },
        yearByYearData: [],
        totalInterestPaid: {},
        totalInvestmentValue: {},
        loanComparisons: [],
      }

      return fallbackResponse
    }

    return response.data
  },

  /**
   * Get risk-adjusted scenarios for financial strategies
   */
  async getRiskScenarios(
    userId: string,
    loans: Loan[],
    monthlyBudget: number,
    strategyName: string,
    baseRiskFactor: number = 0.7, // Standard risk factor (70%)
    currency: Currency = 'USD'
  ): Promise<StrategyRiskAnalysis> {
    // Convert loan format for API compatibility
    const apiFormattedLoans = loans.map((loan) => ({
      loan_id: loan.id,
      name: loan.name,
      balance: loan.balance,
      interest_rate: loan.interestRate,
      term_years: loan.termYears,
      minimum_payment: loan.minimumPayment,
      loan_type: loan.loanType || 'OTHER',
    }))

    const response = await ApiClient.post<any, StrategyRiskAnalysis>(
      `/api/financial-calculations/risk-scenarios`,
      {
        user_id: userId,
        loans: apiFormattedLoans,
        monthly_budget: monthlyBudget,
        strategy_name: strategyName,
        base_risk_factor: baseRiskFactor,
        currency,
      },
      {
        requiresAuth: true,
        requestId: 'risk-scenarios',
      }
    )

    if (response.error || !response.data) {
      // Provide fallback data for UI rendering
      return {
        strategyName,
        scenarios: {
          pessimistic: {
            name: 'pessimistic',
            yearlyData: [],
            finalNetWorth: 0,
            finalInvestmentValue: 0,
            finalDebtValue: 0,
            riskAdjustmentFactor: 0.5,
          },
          standard: {
            name: 'standard',
            yearlyData: [],
            finalNetWorth: 0,
            finalInvestmentValue: 0,
            finalDebtValue: 0,
            riskAdjustmentFactor: 0.7,
          },
          optimistic: {
            name: 'optimistic',
            yearlyData: [],
            finalNetWorth: 0,
            finalInvestmentValue: 0,
            finalDebtValue: 0,
            riskAdjustmentFactor: 0.9,
          },
        },
        comparisonData: [],
      }
    }

    return response.data
  },

  /**
   * Calculate optimal strategy (simplified endpoint)
   */
  async calculateOptimalStrategy(
    loans: Loan[],
    monthlyBudget: number,
    currency: Currency = 'USD'
  ): Promise<any> {
    // Format loans for API
    const formattedLoans = loans.map((loan) => ({
      id: loan.id,
      name: loan.name,
      balance: loan.balance,
      interestRate: loan.interestRate,
      termYears: loan.termYears,
      minimumPayment: loan.minimumPayment,
      loanType: loan.loanType,
    }))

    const response = await ApiClient.post<any, any>(
      `/api/financial-strategy/optimize`,
      {
        loans: formattedLoans,
        monthly_budget: monthlyBudget,
        currency,
      },
      {
        requiresAuth: true,
        requestId: 'optimize-strategy',
      }
    )

    if (response.error || !response.data) {
      // Return minimal fallback
      return {
        optimal_strategy: 'debt-avalanche',
        total_minimum_payment: 0,
        monthly_surplus: 0,
        loan_comparisons: [],
        strategies: {},
      }
    }

    return response.data
  },

  /**
   * Generate loan recommendations
   */
  async generateLoanRecommendations(
    loans: Loan[],
    monthlyAvailable: number
  ): Promise<any> {
    // Format loans for API
    const formattedLoans = loans.map((loan) => ({
      id: loan.id,
      name: loan.name,
      balance: loan.balance,
      interestRate: loan.interestRate,
      termYears: loan.termYears,
      minimumPayment: loan.minimumPayment,
      loanType: loan.loanType,
    }))

    const response = await ApiClient.post<any, any>(
      `/api/recommendations`,
      {
        loans: formattedLoans,
        monthly_available: monthlyAvailable,
      },
      {
        requiresAuth: true,
        requestId: 'loan-recommendations',
      }
    )

    if (response.error || !response.data) {
      // Return minimal fallback recommendations
      return [
        {
          title: 'Prioritize high-interest debt',
          description:
            'Focus on paying down your highest interest rate loans first to minimize interest costs.',
          priority: 'high',
        },
        {
          title: 'Build an emergency fund',
          description:
            'Before focusing heavily on debt repayment, ensure you have 3-6 months of expenses saved.',
          priority: 'high',
        },
      ]
    }

    return response.data
  },

  /**
   * Get tax optimization advice for loans
   */
  async getLoanTaxOptimization(
    loanId: number,
    loanType: string,
    balance: number,
    interestRate: number,
    country: string = 'US'
  ): Promise<any> {
    const response = await ApiClient.get<any>(
      `/api/loans/${loanId}/tax-optimization`,
      {
        requiresAuth: true,
        params: {
          loan_type: loanType,
          balance,
          interest_rate: interestRate,
          country,
        },
        cache: {
          enabled: true,
          ttl: 1000 * 60 * 60, // 1 hour
        },
        requestId: `tax-optimization-${loanId}`,
      }
    )

    if (response.error || !response.data) {
      // Return minimal fallback data
      return {
        is_tax_deductible:
          loanType === 'MORTGAGE' ||
          loanType === 'MORTGAGE_BOND' ||
          loanType === 'STUDENT',
        deduction_rate: country === 'DK' ? 0.33 : 0.25,
        annual_interest: balance * (interestRate / 100),
        estimated_savings:
          loanType === 'MORTGAGE' ||
          loanType === 'MORTGAGE_BOND' ||
          loanType === 'STUDENT'
            ? balance * (interestRate / 100) * (country === 'DK' ? 0.33 : 0.25)
            : 0,
        recommendations: [
          'Remember to include loan interest in your tax return',
          'Keep detailed records of all interest payments',
          'Consider consulting a tax professional for optimal tax strategies',
        ],
      }
    }

    return response.data
  },
}
