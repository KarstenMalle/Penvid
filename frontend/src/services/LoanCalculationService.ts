// frontend/src/services/LoanCalculationService.ts

import { Loan } from '@/components/features/wealth-optimizer/types'
import { createClient } from '@/lib/supabase-browser'

/**
 * Interfaces for loan calculation API
 */
export interface LoanCalculationRequest {
  principal: number
  annual_rate: number
  monthly_payment?: number
  term_years?: number
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
 * Service for loan calculations via backend API
 */
export const LoanCalculationService = {
  /**
   * Calculate loan details (payment, term, interest)
   */
  async calculateLoanDetails(
    request: LoanCalculationRequest
  ): Promise<LoanCalculationResponse> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(`${API_BASE_URL}/api/loans/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error in calculateLoanDetails:', error)

      // Fallback calculation for critical errors
      let fallbackResult: LoanCalculationResponse = {
        monthly_payment: 0,
        loan_term: { months: 0, years: 0 },
        total_interest: 0,
      }

      if (request.principal && request.annual_rate) {
        // Simple fallback calculation for monthly payment
        if (request.term_years && !request.monthly_payment) {
          const monthlyRate = request.annual_rate / 12 / 100
          const numPayments = request.term_years * 12
          fallbackResult.monthly_payment =
            (request.principal *
              monthlyRate *
              Math.pow(1 + monthlyRate, numPayments)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1)
        }

        // Simple fallback calculation for term
        if (request.monthly_payment && !request.term_years) {
          const monthlyRate = request.annual_rate / 12 / 100
          const numPayments =
            Math.log(
              request.monthly_payment /
                (request.monthly_payment - request.principal * monthlyRate)
            ) / Math.log(1 + monthlyRate)

          fallbackResult.loan_term = {
            months: Math.ceil(numPayments),
            years: Math.ceil(numPayments) / 12,
          }
        }
      }

      return fallbackResult
    }
  },

  /**
   * Get amortization schedule for a loan
   */
  async getAmortizationSchedule(
    loanId: number,
    request: LoanCalculationRequest
  ): Promise<AmortizationEntry[]> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(`${API_BASE_URL}/api/loans/amortization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          loan_id: loanId,
          ...request,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data.schedule || []
    } catch (error) {
      console.error('Error in getAmortizationSchedule:', error)
      return [] // Return empty array on error
    }
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
    try {
      const token = await getAuthToken()

      // Format parameters for the API
      const apiParams = {
        loans: params.loans.map((loan) => ({
          id: loan.id,
          name: loan.name,
          balance: loan.balance,
          interestRate: loan.interestRate,
          minimumPayment: loan.minimumPayment,
          loanType: loan.loanType || 'OTHER',
        })),
        monthly_available: params.monthly_available,
        results: params.results,
        optimal_strategy: params.optimal_strategy,
        loan_comparisons: params.loan_comparisons,
      }

      // Call backend API directly
      const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(apiParams),
      })

      if (!response.ok) {
        console.error('API error details:', await response.text())
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error in generateRecommendations:', error)

      // Fallback recommendations
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
  },
}
