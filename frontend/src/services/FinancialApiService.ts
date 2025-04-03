// frontend/src/services/FinancialApiService.ts

import { Loan } from '@/components/features/wealth-optimizer/types'
import { Currency } from '@/i18n/config'
import { createClient } from '@/lib/supabase-browser'

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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

/**
 * Get auth token from Supabase
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
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
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/settings`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
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
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(settings),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
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
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/investment/projection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            monthly_amount: monthlyAmount,
            annual_return: annualReturn,
            months,
            inflation_rate: inflationRate,
            risk_factor: riskFactor,
            currency,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
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
      const token = await getAuthToken()

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

      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/financial-strategy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            loans: apiFormattedLoans,
            monthly_surplus: monthlyBudget,
            annual_investment_return: annualInvestmentReturn,
            inflation_rate: inflationRate,
            risk_factor: riskFactor,
            currency,
          }),
        }
      )

      if (!response.ok) {
        console.error('API Error:', await response.text())
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || result // Handle both data wrapper and direct response
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
