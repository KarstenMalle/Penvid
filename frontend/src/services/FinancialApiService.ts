// src/services/FinancialApiService.ts

import { Currency } from '@/i18n/config'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { createClient } from '@/lib/supabase-browser'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface ApiLoan {
  loan_id: number
  name: string
  balance: number
  interest_rate: number
  term_years: number
  minimum_payment: number
  loan_type?: string
}

export interface FinancialOverview {
  loans: ApiLoan[]
  surplus_balance: number
}

export interface AmortizationEntry {
  month: number
  payment_date: string
  payment: number
  principal_payment: number
  interest_payment: number
  extra_payment: number
  remaining_balance: number
}

export interface AmortizationResponse {
  schedule: AmortizationEntry[]
  total_interest_paid: number
  months_to_payoff: number
}

export interface InvestmentEntry {
  month: number
  date: string
  balance: number
  inflation_adjusted_balance: number
  risk_adjusted_balance: number
}

export interface InvestmentResponse {
  projection: InvestmentEntry[]
  final_balance: number
  inflation_adjusted_final_balance: number
  risk_adjusted_balance: number
}

export interface FinancialRecommendation {
  best_strategy: string
  reason: string
  interest_savings: number
  months_saved: number
  investment_value_after_loan_payoff: number
  investment_value_immediate_invest: number
  total_savings_advantage: number
}

export interface FinancialStrategyResponse {
  recommendation: FinancialRecommendation
  loan_details: {
    name: string
    interest_rate: number
    payoff_months_with_extra: number
    payoff_months_minimum: number
  }
  amortization_comparison: {
    baseline: {
      total_interest: number
      months_to_payoff: number
    }
    with_extra_payments: {
      total_interest: number
      months_to_payoff: number
    }
  }
  investment_comparison: {
    immediate_investment: {
      final_balance: number
      risk_adjusted_balance: number
    }
    investment_after_payoff: {
      final_balance: number
      risk_adjusted_balance: number
    }
  }
}

export interface UserSettings {
  expected_inflation: number
  expected_investment_return: number
  risk_tolerance: number
}

export class FinancialApiService {
  private static async getAuthToken(): Promise<string> {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      throw new Error('No active session found')
    }
    return data.session.access_token
  }

  private static async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getAuthToken()
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  static async getFinancialOverview(
    userId: string
  ): Promise<FinancialOverview> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/financial-overview`,
        {
          headers,
        }
      )

      if (!response.ok) {
        // Get more detailed error information
        let errorDetail = ''
        try {
          const errorData = await response.json()
          errorDetail = JSON.stringify(errorData)
        } catch (parseError) {
          errorDetail = response.statusText
        }

        console.error(`API Error ${response.status}: ${errorDetail}`)
        throw new Error(`Error ${response.status}: ${errorDetail}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching financial overview:', error)
      // For now, return an empty response to prevent cascading failures
      return { loans: [], surplus_balance: 0 }
    }
  }

  static async getAmortizationSchedule(
    userId: string,
    loanId: number,
    principal: number,
    annualRate: number,
    monthlyPayment: number,
    extraPayment: number = 0,
    currency: Currency = 'USD'
  ): Promise<AmortizationResponse> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/loan/${loanId}/amortization`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            principal,
            annual_rate: annualRate,
            monthly_payment: monthlyPayment,
            extra_payment: extraPayment,
            currency,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching amortization schedule:', error)
      throw error
    }
  }

  static async getInvestmentProjection(
    monthlyAmount: number,
    annualReturn: number,
    months: number,
    inflationRate: number = 0.025,
    riskFactor: number = 0.2,
    currency: Currency = 'USD'
  ): Promise<InvestmentResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/investment/projection`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching investment projection:', error)
      throw error
    }
  }

  static async getFinancialStrategy(
    userId: string,
    loans: Loan[],
    monthlySurplus: number,
    annualInvestmentReturn: number = 0.07,
    inflationRate: number = 0.025,
    riskFactor: number = 0.2,
    currency: Currency = 'USD'
  ): Promise<FinancialStrategyResponse> {
    try {
      const headers = await this.getAuthHeaders()

      // Convert our frontend loan objects to the format expected by the API
      const apiLoans = loans.map((loan) => ({
        name: loan.name,
        balance: loan.balance,
        interest_rate: loan.interestRate / 100, // Convert percentage to decimal
        term_years: loan.termYears,
        minimum_payment: loan.minimumPayment,
        loan_type: loan.loanType || LoanType.OTHER,
      }))

      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/financial-strategy`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            loans: apiLoans,
            monthly_surplus: monthlySurplus,
            annual_investment_return: annualInvestmentReturn,
            inflation_rate: inflationRate,
            risk_factor: riskFactor,
            currency,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching financial strategy:', error)
      throw error
    }
  }

  static async convertCurrency(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<{ converted_amount: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/currency/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          from_currency: fromCurrency,
          to_currency: toCurrency,
        }),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error converting currency:', error)
      throw error
    }
  }

  static async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/settings`,
        {
          headers,
        }
      )

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user settings:', error)
      throw error
    }
  }

  static async updateUserSettings(
    userId: string,
    settings: UserSettings
  ): Promise<UserSettings> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/settings`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(settings),
        }
      )

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating user settings:', error)
      throw error
    }
  }
}
