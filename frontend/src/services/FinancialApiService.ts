// frontend/src/services/FinancialApiService.ts

import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { Currency } from '@/i18n/config'
import { createClient } from '@/lib/supabase-browser'

/**
 * Service for interacting with the financial calculations API
 */

// Base API URL from environment variable or fallback
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'

// Interfaces for API responses
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

export interface FinancialOverview {
  loans: Loan[]
  surplus_balance: number
}

export interface UserSettings {
  expected_inflation: number
  expected_investment_return: number
  risk_tolerance: number
}

export interface StrategyRecommendation {
  best_strategy: string
  reason: string
  interest_savings: number
  months_saved: number
  investment_value_after_loan_payoff: number
  investment_value_immediate_invest: number
  total_savings_advantage: number
}

export interface LoanDetail {
  name: string
  interest_rate: number
  payoff_months_with_extra: number
  payoff_months_minimum: number
}

export interface AmortizationComparison {
  baseline: {
    total_interest: number
    months_to_payoff: number
  }
  with_extra_payments: {
    total_interest: number
    months_to_payoff: number
  }
}

export interface InvestmentComparison {
  immediate_investment: {
    final_balance: number
    risk_adjusted_balance: number
  }
  investment_after_payoff: {
    final_balance: number
    risk_adjusted_balance: number
  }
}

export interface FinancialStrategyResponse {
  recommendation: StrategyRecommendation
  loan_details: LoanDetail
  amortization_comparison: AmortizationComparison
  investment_comparison: InvestmentComparison
}

export class FinancialApiService {
  /**
   * Get authentication token for API requests
   */
  private static async getAuthToken(): Promise<string | null> {
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
   * Make an authenticated API request
   */
  private static async fetchWithAuth(
    url: string,
    method: string = 'GET',
    body?: any
  ): Promise<any> {
    const token = await this.getAuthToken()

    if (!token) {
      throw new Error('Authentication required')
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `API Error ${response.status}: ${JSON.stringify(errorData)}`
      )
    }

    return response.json()
  }

  /**
   * Get amortization schedule for a loan
   */
  static async getAmortizationSchedule(
    userId: string,
    loanId: number,
    principal: number,
    annualRate: number,
    monthlyPayment: number,
    extraPayment: number = 0,
    currency: string = 'USD'
  ): Promise<AmortizationResponse> {
    const url = `${API_BASE_URL}/user/${userId}/loan/${loanId}/amortization`

    const body = {
      principal,
      annual_rate: annualRate,
      monthly_payment: monthlyPayment,
      extra_payment: extraPayment,
      max_years: 30,
      currency,
    }

    return this.fetchWithAuth(url, 'POST', body)
  }

  /**
   * Get investment projection
   */
  static async getInvestmentProjection(
    monthlyAmount: number,
    annualReturn: number,
    months: number,
    inflationRate: number = 0.025,
    riskFactor: number = 0.2,
    currency: string = 'USD'
  ): Promise<InvestmentResponse> {
    const url = `${API_BASE_URL}/investment/projection`

    const body = {
      monthly_amount: monthlyAmount,
      annual_return: annualReturn,
      months,
      inflation_rate: inflationRate,
      risk_factor: riskFactor,
      currency,
    }

    return this.fetchWithAuth(url, 'POST', body)
  }

  /**
   * Get financial overview for a user
   */
  static async getFinancialOverview(
    userId: string
  ): Promise<FinancialOverview> {
    const url = `${API_BASE_URL}/user/${userId}/financial-overview`
    return this.fetchWithAuth(url)
  }

  /**
   * Get optimal financial strategy
   */
  static async getFinancialStrategy(
    userId: string,
    loans: Loan[],
    monthlyAvailable: number,
    annualInvestmentReturn: number = 0.07,
    inflationRate: number = 0.025,
    riskFactor: number = 0.2,
    currency: string = 'USD'
  ): Promise<FinancialStrategyResponse> {
    const url = `${API_BASE_URL}/user/${userId}/financial-strategy`

    // Format loans for API
    const formattedLoans = loans.map((loan) => ({
      loan_id: loan.id,
      name: loan.name,
      balance: loan.balance,
      interest_rate: loan.interestRate,
      term_years: loan.termYears,
      minimum_payment: loan.minimumPayment,
      loan_type: loan.loanType || LoanType.OTHER,
    }))

    const body = {
      loans: formattedLoans,
      monthly_surplus: monthlyAvailable,
      annual_investment_return: annualInvestmentReturn,
      inflation_rate: inflationRate,
      risk_factor: riskFactor,
      currency,
    }

    return this.fetchWithAuth(url, 'POST', body)
  }

  /**
   * Get user settings
   */
  static async getUserSettings(userId: string): Promise<UserSettings> {
    const url = `${API_BASE_URL}/user/${userId}/settings`
    return this.fetchWithAuth(url)
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(
    userId: string,
    settings: UserSettings
  ): Promise<UserSettings> {
    const url = `${API_BASE_URL}/user/${userId}/settings`
    return this.fetchWithAuth(url, 'POST', settings)
  }

  /**
   * Convert currency
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string = 'USD',
    toCurrency: string = 'USD'
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount

    const url = `${API_BASE_URL}/currency/convert`

    const body = {
      amount,
      from_currency: fromCurrency,
      to_currency: toCurrency,
    }

    const response = await this.fetchWithAuth(url, 'POST', body)
    return response.converted_amount
  }
}
