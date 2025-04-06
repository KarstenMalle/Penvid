// frontend/src/services/LoanCalculationService.ts

import { Loan } from '@/components/features/wealth-optimizer/types'
import { get, post, put, del } from '@/utils/api-helper'

/**
 * Interfaces for loan calculation API
 */

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
  loan_details?: {
    id: number
    name: string
    balance: number
    interestRate: number
    termYears: number
  }
}

export interface PaymentAnalysis {
  loanId: number
  loanName: string
  loanType: string
  initialBalance: number
  currentBalance: number
  interestRate: number
  termYears: number
  monthlyPayment: number
  totalPayments: number
  estimatedPayoffDate: string
  totalPaid: number
  totalInterest: number
  totalPrincipal: number
  interestToBalanceRatio: number
  monthlyInterest: number
  extraPaymentAnalysis?: {
    extraMonthlyPayment: number
    payoffWithExtraPayments: number
    monthsSaved: number
    interestSaved: number
    totalPaidWithExtraPayments: number
  }
}

export interface Recommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface WhatIfScenario {
  name: string
  principal?: number
  interest_rate?: number
  monthly_payment?: number
  extra_payment?: number
}

/**
 * Service for loan calculations via backend API
 * All currency conversion is handled by the backend
 */
export const LoanCalculationService = {
  /**
   * Calculate loan details based on loan ID
   */
  async calculateLoanDetails(
    userId: string,
    loanId: number,
    extraPayment: number = 0
  ): Promise<LoanCalculationResponse> {
    try {
      const response = await post<any>(
        '/api/loans/calculate',
        {
          user_id: userId,
          loan_id: loanId,
          extra_payment: extraPayment,
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

      // No currency conversion needed - backend handles it
      return response.data.data
    } catch (error) {
      console.error('Error calculating loan details:', error)
      throw error
    }
  },

  /**
   * Get amortization schedule for a loan by ID
   */
  async getAmortizationSchedule(
    userId: string,
    loanId: number,
    extraPayment: number = 0,
    maxYears: number = 30
  ): Promise<{
    schedule: AmortizationEntry[]
    total_interest_paid: number
    months_to_payoff: number
    payment_analysis: any
  }> {
    try {
      const response = await post<any>(
        `/api/loans/${loanId}/amortization`,
        {
          user_id: userId,
          extra_payment: extraPayment,
          max_years: maxYears,
        },
        {
          requiresAuth: true,
          errorMessage: 'Failed to generate amortization schedule',
        }
      )

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message || 'Failed to fetch amortization schedule'
        )
      }

      // No currency conversion needed - backend handles it
      return response.data.data
    } catch (error) {
      console.error('Error getting amortization schedule:', error)
      throw error
    }
  },

  /**
   * Get detailed payment analysis for a loan
   */
  async getPaymentAnalysis(
    userId: string,
    loanId: number,
    extraPayment: number = 0
  ): Promise<PaymentAnalysis> {
    try {
      const response = await post<any>(
        '/api/loans/payment-analysis',
        {
          user_id: userId,
          loan_id: loanId,
          extra_payment: extraPayment,
        },
        {
          requiresAuth: true,
          errorMessage: 'Failed to get payment analysis',
        }
      )

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message || 'Failed to get payment analysis'
        )
      }

      // No currency conversion needed - backend handles it
      return response.data.data
    } catch (error) {
      console.error('Error getting payment analysis:', error)
      throw error
    }
  },

  /**
   * Generate personalized financial recommendations based on loan IDs
   */
  async generateRecommendations(params: {
    userId: string
    loanIds: number[]
    monthly_available: number
  }): Promise<Recommendation[]> {
    try {
      const response = await post<any>(
        '/api/recommendations',
        {
          user_id: params.userId,
          loan_ids: params.loanIds,
          monthly_available: params.monthly_available,
        },
        {
          requiresAuth: true,
          errorMessage: 'Failed to generate recommendations',
        }
      )

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message || 'Failed to generate recommendations'
        )
      }

      // No currency conversion needed - backend handles it
      return response.data.data
    } catch (error) {
      console.error('Error generating recommendations:', error)
      throw error
    }
  },

  /**
   * Calculate what-if scenarios for a loan
   */
  async calculateWhatIfScenarios(
    userId: string,
    loanId: number,
    scenarios: WhatIfScenario[]
  ): Promise<any> {
    try {
      const response = await post<any>(
        '/api/loans/what-if-scenarios',
        {
          user_id: userId,
          loan_id: loanId,
          scenarios,
        },
        {
          requiresAuth: true,
          errorMessage: 'Failed to calculate what-if scenarios',
        }
      )

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message || 'Failed to calculate what-if scenarios'
        )
      }

      // No currency conversion needed - backend handles it
      return response.data.data
    } catch (error) {
      console.error('Error calculating what-if scenarios:', error)
      throw error
    }
  },

  /**
   * Calculate optimal debt payoff strategy based on loan IDs
   */
  async calculateOptimalStrategy(
    userId: string,
    loanIds: number[],
    monthlyBudget: number
  ): Promise<any> {
    try {
      const response = await post<any>(
        '/api/financial-strategy/optimize',
        {
          user_id: userId,
          loan_ids: loanIds,
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

      // No currency conversion needed - backend handles it
      return response.data.data
    } catch (error) {
      console.error('Error calculating optimal strategy:', error)
      throw error
    }
  },

  /**
   * Batch calculate details for multiple loans at once
   */
  async batchCalculateLoans(userId: string, loanIds: number[]): Promise<any[]> {
    try {
      const response = await post<any>(
        '/api/loans/batch-calculate',
        {
          user_id: userId,
          loan_ids: loanIds,
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

      // No currency conversion needed - backend handles it
      return response.data.data
    } catch (error) {
      console.error('Error batch calculating loans:', error)
      throw error
    }
  },
}
