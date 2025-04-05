// frontend/src/services/LoanCalculationService.ts

import { Loan } from '@/components/features/wealth-optimizer/types'
import { apiRequest, get, post } from '@/utils/api-helper'

/**
 * Interfaces for loan calculation API
 */

// Interface for AmortizationRequest to help with typechecking
export interface AmortizationRequest {
  principal: number
  annual_rate: number
  monthly_payment: number
  extra_payment?: number
  max_years?: number
  currency?: string
}

export interface LoanCalculationRequest {
  principal: number
  annual_rate: number
  term_years?: number
  monthly_payment?: number
  extra_payment?: number
  currency?: string
}

export interface LoanTerm {
  months: number
  years: number
}

export interface ExtraPaymentImpact {
  original_term: LoanTerm
  new_term: LoanTerm
  months_saved: number
  interest_saved: number
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

export interface LoanCalculationResponse {
  monthly_payment: number
  loan_term: LoanTerm
  total_interest: number
  extra_payment_impact?: ExtraPaymentImpact
  amortization?: AmortizationEntry[]
}

export interface Recommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
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
    // IMPORTANT: Backend expects annual_rate as percentage (e.g., 5.0 for 5%)
    // NOT as decimal (0.05), so we don't divide by 100 here
    const response = await post<any>(
      '/api/loans/calculate',
      {
        ...request,
        // Make sure annual_rate is passed as percentage
        annual_rate: request.annual_rate,
      },
      {
        requiresAuth: true,
        errorMessage: 'Failed to calculate loan details',
      }
    )

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to calculate loan details'
      )
    }

    // Extract just the data from the response
    return response.data.data
  },

  /**
   * Get amortization schedule for a loan
   */
  async getAmortizationSchedule(
    loanId: number,
    request: AmortizationRequest
  ): Promise<{
    schedule: AmortizationEntry[]
    total_interest_paid: number
    months_to_payoff: number
  }> {
    // IMPORTANT: Pass annualRate as percentage (5.0), not decimal (0.05)
    const response = await post<any>(
      `/api/loans/${loanId}/amortization`,
      {
        principal: request.principal,
        annual_rate: request.annual_rate, // Pass as percentage
        monthly_payment: request.monthly_payment,
        extra_payment: request.extra_payment || 0,
        currency: request.currency || 'USD',
      },
      {
        requiresAuth: true, // Make sure we're sending the auth token
        errorMessage: 'Failed to generate amortization schedule',
      }
    )

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to fetch amortization schedule'
      )
    }

    // Extract just the data from the response
    return response.data.data
  },

  /**
   * Generate personalized financial recommendations
   */
  async generateRecommendations(params: {
    loans: Loan[]
    monthly_available: number
    results?: any
    optimal_strategy?: any
    loan_comparisons?: any[]
  }): Promise<Recommendation[]> {
    const response = await post<any>('/api/recommendations', params, {
      requiresAuth: true,
      errorMessage: 'Failed to generate recommendations',
    })

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to generate recommendations'
      )
    }

    // Extract just the data from the response
    return response.data.data
  },

  /**
   * Calculate optimal debt payoff strategy
   */
  async calculateOptimalStrategy(
    loans: Loan[],
    monthlyBudget: number
  ): Promise<any> {
    const response = await post<any>(
      '/api/financial-strategy/optimize',
      {
        loans,
        monthly_budget: monthlyBudget,
      },
      {
        requiresAuth: true,
        errorMessage: 'Failed to calculate optimal strategy',
      }
    )

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to calculate optimal strategy'
      )
    }

    // Extract just the data from the response
    return response.data.data
  },
}
