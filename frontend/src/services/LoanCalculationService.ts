// frontend/src/services/LoanCalculationService.ts

import { apiClient } from './api'
import { Currency } from '@/i18n/config'

/**
 * Interface for loan calculation request
 */
export interface LoanCalculationRequest {
  principal: number
  annual_rate: number
  term_years?: number
  monthly_payment?: number
  extra_payment?: number
  currency?: string
}

/**
 * Interface for loan term response
 */
export interface LoanTerm {
  months: number
  years: number
}

/**
 * Interface for amortization schedule entry
 */
export interface AmortizationEntry {
  month: number
  payment_date: string
  payment: number
  principal_payment: number
  interest_payment: number
  extra_payment: number
  remaining_balance: number
}

/**
 * Interface for loan calculation response
 */
export interface LoanCalculationResponse {
  monthly_payment: number
  loan_term: LoanTerm
  total_interest: number
  extra_payment_impact?: {
    original_term: LoanTerm
    new_term: LoanTerm
    months_saved: number
    interest_saved: number
  }
  amortization?: AmortizationEntry[]
}

/**
 * Service for loan calculations via backend API
 */
export const LoanCalculationService = {
  /**
   * Calculate loan details (payment, term, interest)
   */
  async calculateLoanDetails(
    request: LoanCalculationRequest
  ): Promise<LoanCalculationResponse> {
    const response = await apiClient.post<LoanCalculationResponse>(
      '/api/loans/calculate',
      request
    )

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to calculate loan details'
      )
    }

    // Extract data from the standardized response format
    if (response.data.data) {
      return response.data.data
    }

    return response.data
  },

  /**
   * Get amortization schedule for a loan
   */
  async getAmortizationSchedule(
    loanId: number,
    request: {
      principal: number
      annual_rate: number
      monthly_payment: number
      extra_payment?: number
      max_years?: number
      currency?: Currency
    }
  ): Promise<{
    schedule: AmortizationEntry[]
    total_interest_paid: number
    months_to_payoff: number
  }> {
    const response = await apiClient.post<any>(
      `/api/loans/${loanId}/amortization`,
      request
    )

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to generate amortization schedule'
      )
    }

    // Extract data from the standardized response format
    if (response.data.data) {
      return response.data.data
    }

    return response.data
  },

  /**
   * Generate personalized financial recommendations
   */
  async generateRecommendations(params: any): Promise<any> {
    const response = await apiClient.post<any>('/api/recommendations', params)

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to generate recommendations'
      )
    }

    // Extract data from the standardized response format
    if (response.data.data) {
      return response.data.data
    }

    return response.data
  },

  /**
   * Calculate optimal debt payoff strategy
   */
  async calculateOptimalStrategy(
    loans: any[],
    monthlyBudget: number
  ): Promise<any> {
    const response = await apiClient.post<any>(
      '/api/financial-strategy/optimize',
      {
        loans,
        monthly_budget: monthlyBudget,
      }
    )

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to calculate optimal strategy'
      )
    }

    // Extract data from the standardized response format
    if (response.data.data) {
      return response.data.data
    }

    return response.data
  },

  /**
   * Calculate monthly payment for a loan
   */
  async calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    years: number,
    currency: Currency = 'USD'
  ): Promise<number> {
    const response = await this.calculateLoanDetails({
      principal,
      annual_rate: annualRate,
      term_years: years,
      currency,
    })

    return response.monthly_payment
  },

  /**
   * Calculate loan term
   */
  async calculateLoanTerm(
    principal: number,
    annualRate: number,
    monthlyPayment: number,
    currency: Currency = 'USD'
  ): Promise<LoanTerm> {
    const response = await this.calculateLoanDetails({
      principal,
      annual_rate: annualRate,
      monthly_payment: monthlyPayment,
      currency,
    })

    return response.loan_term
  },

  /**
   * Calculate total interest paid
   */
  async calculateTotalInterestPaid(
    principal: number,
    annualRate: number,
    monthlyPayment: number,
    currency: Currency = 'USD'
  ): Promise<number> {
    const response = await this.calculateLoanDetails({
      principal,
      annual_rate: annualRate,
      monthly_payment: monthlyPayment,
      currency,
    })

    return response.total_interest
  },
}
