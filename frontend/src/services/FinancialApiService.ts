// frontend/src/services/FinancialApiService.ts

import { createClient } from '@/lib/supabase-browser'
import { Loan } from '@/components/features/wealth-optimizer/types'
import { Currency } from '@/i18n/config'

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

export interface StrategyResultData {
  yearlyData: any[]
  finalNetWorth: number
  totalInterestPaid: number
  loanPayoffDetails: Record<string, any>
  investmentDetails: any[]
  strategyName: string
  strategyDescription: string
}

export interface FinancialStrategyResponse {
  recommendation: {
    name: string
    description: string
    netWorthDifference: Record<string, number>
  }
  results: Record<string, StrategyResultData>
  yearByYearData: any[]
  totalInterestPaid: Record<string, number>
  totalInvestmentValue: Record<string, number>
  loanComparisons: any[]
}

/**
 * Service for financial calculations via backend API
 */
export const FinancialApiService = {
  /**
   * Get user financial settings
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      const supabase = createClient()

      // Call backend API
      const { data, error } = await supabase.functions.invoke(
        `user/${userId}/settings`,
        {
          body: {},
        }
      )

      if (error) {
        console.error('Error fetching user settings:', error)
        throw new Error(`Failed to fetch user settings: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getUserSettings:', error)

      // Return default settings
      return {
        expected_inflation: 0.025,
        expected_investment_return: 0.07,
        risk_tolerance: 0.2,
      }
    }
  },

  /**
   * Update user financial settings
   */
  async updateUserSettings(
    userId: string,
    settings: UserSettings
  ): Promise<UserSettings> {
    try {
      const supabase = createClient()

      // Call backend API
      const { data, error } = await supabase.functions.invoke(
        `user/${userId}/settings`,
        {
          body: settings,
          method: 'POST',
        }
      )

      if (error) {
        console.error('Error updating user settings:', error)
        throw new Error(`Failed to update user settings: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in updateUserSettings:', error)
      throw error
    }
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
    try {
      const supabase = createClient()

      // Call backend API
      const { data, error } = await supabase.functions.invoke(
        'investment/projection',
        {
          body: {
            monthly_amount: monthlyAmount,
            annual_return: annualReturn,
            months,
            inflation_rate: inflationRate,
            risk_factor: riskFactor,
            currency,
          },
        }
      )

      if (error) {
        console.error('Error getting investment projection:', error)
        throw new Error(`Failed to get investment projection: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getInvestmentProjection:', error)

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
    try {
      const supabase = createClient()

      // Call backend API
      const { data, error } = await supabase.functions.invoke(
        `user/${userId}/financial-strategy`,
        {
          body: {
            loans,
            monthly_surplus: monthlyBudget,
            annual_investment_return: annualInvestmentReturn,
            inflation_rate: inflationRate,
            risk_factor: riskFactor,
            currency,
          },
        }
      )

      if (error) {
        console.error('Error calculating financial strategy:', error)
        throw new Error(
          `Failed to calculate financial strategy: ${error.message}`
        )
      }

      return data
    } catch (error) {
      console.error('Error in getFinancialStrategy:', error)

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
  },
}
