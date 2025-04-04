// frontend/src/services/LoanCalculationService.ts

import { Loan } from '@/components/features/wealth-optimizer/types'
import { ApiClient } from './ApiClient'

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
    request: LoanCalculationRequest,
    abortSignal?: AbortSignal
  ): Promise<LoanCalculationResponse> {
    // IMPORTANT: Backend expects annual_rate as percentage (e.g., 5.0 for 5%)
    // NOT as decimal (0.05), so we don't divide by 100 here
    const response = await ApiClient.post<
      LoanCalculationRequest,
      LoanCalculationResponse
    >(
      '/api/loans/calculate',
      {
        ...request,
        // Make sure annual_rate is passed as percentage
        annual_rate: request.annual_rate,
      },
      {
        requiresAuth: true,
        signal: abortSignal,
        requestId: 'calculate-loan-details',
      }
    )

    if (response.error || !response.data) {
      console.error('Error in calculateLoanDetails:', response.error)
      // Return minimal default response on error
      return {
        monthly_payment: 0,
        loan_term: { months: 0, years: 0 },
        total_interest: 0,
      }
    }

    return response.data
  },

  /**
   * Get amortization schedule for a loan
   */
  async getAmortizationSchedule(
    loanId: number,
    principal: number,
    annualRate: number,
    monthlyPayment: number,
    extraPayment: number = 0,
    currency: string = 'USD',
    abortSignal?: AbortSignal
  ): Promise<{
    schedule: AmortizationEntry[]
    total_interest_paid: number
    months_to_payoff: number
  }> {
    try {
      // IMPORTANT: Pass annualRate as percentage (5.0), not decimal (0.05)
      const response = await ApiClient.post<
        AmortizationRequest,
        {
          schedule: AmortizationEntry[]
          total_interest_paid: number
          months_to_payoff: number
        }
      >(
        `/api/loans/${loanId}/amortization`,
        {
          principal,
          annual_rate: annualRate, // Pass as percentage
          monthly_payment: monthlyPayment,
          extra_payment: extraPayment,
          currency,
        },
        {
          requiresAuth: true,
          signal: abortSignal,
          requestId: `amortization-${loanId}`,
        }
      )

      if (response.error || !response.data) {
        throw new Error(
          response.error?.message || 'Failed to fetch amortization schedule'
        )
      }

      return {
        schedule: response.data.schedule || [],
        total_interest_paid: response.data.total_interest_paid || 0,
        months_to_payoff: response.data.months_to_payoff || 0,
      }
    } catch (error) {
      console.error('Error in getAmortizationSchedule:', error)

      // Use local calculation as fallback
      const schedule = this.generateAmortizationScheduleLocal(
        principal,
        annualRate,
        monthlyPayment,
        extraPayment
      )

      // Calculate total interest from schedule
      const totalInterest = schedule.reduce(
        (sum, entry) => sum + entry.interest_payment,
        0
      )

      return {
        schedule,
        total_interest_paid: totalInterest,
        months_to_payoff: schedule.length,
      }
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
    const response = await ApiClient.post<any, Recommendation[]>(
      '/api/recommendations',
      params,
      {
        requiresAuth: true,
        requestId: 'generate-recommendations',
      }
    )

    if (response.error || !response.data) {
      // Return fallback recommendations
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
   * Calculate optimal debt payoff strategy
   */
  async calculateOptimalStrategy(
    loans: Loan[],
    monthlyBudget: number,
    abortSignal?: AbortSignal
  ): Promise<any> {
    const response = await ApiClient.post<any, any>(
      '/api/financial-strategy/optimize',
      {
        loans,
        monthly_budget: monthlyBudget,
      },
      {
        requiresAuth: true,
        signal: abortSignal,
        requestId: 'calculate-strategy',
      }
    )

    if (response.error || !response.data) {
      // Return minimal response on error
      return {
        optimal_strategy: 'debt-avalanche',
        loan_comparisons: [],
        strategies: {},
      }
    }

    return response.data
  },

  /**
   * Calculate monthly payment for a loan (client-side calculation)
   * @param principal The loan principal amount
   * @param annualRate The annual interest rate (as percentage, e.g., 5.5 for 5.5%)
   * @param years The loan term in years
   * @returns The monthly payment amount
   */
  calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    years: number
  ): number {
    if (principal <= 0 || years <= 0) {
      return 0
    }

    const monthlyRate = annualRate / 100 / 12
    const payments = years * 12

    // Special case for 0% loans
    if (monthlyRate === 0) {
      return principal / payments
    }

    return (
      (principal * monthlyRate * Math.pow(1 + monthlyRate, payments)) /
      (Math.pow(1 + monthlyRate, payments) - 1)
    )
  },

  /**
   * Calculate the time it will take to pay off a loan (client-side calculation)
   * @param principal The loan principal amount
   * @param annualRate The annual interest rate (as percentage, e.g., 5.5 for 5.5%)
   * @param monthlyPayment The monthly payment amount
   * @returns Object containing months and years to payoff
   */
  calculateLoanTerm(
    principal: number,
    annualRate: number,
    monthlyPayment: number
  ): LoanTerm {
    if (principal <= 0 || monthlyPayment <= 0) {
      return { months: 0, years: 0 }
    }

    const monthlyRate = annualRate / 100 / 12

    // Special case for 0% loans
    if (monthlyRate === 0) {
      const months = Math.ceil(principal / monthlyPayment)
      return {
        months,
        years: months / 12,
      }
    }

    // If payment is too small to cover interest
    if (monthlyPayment <= principal * monthlyRate) {
      return { months: Infinity, years: Infinity }
    }

    // Standard formula: n = -log(1 - (P*r)/PMT) / log(1+r)
    // where: n = number of payments, P = principal, r = monthly rate, PMT = payment
    const n =
      -Math.log(1 - (principal * monthlyRate) / monthlyPayment) /
      Math.log(1 + monthlyRate)

    const months = Math.ceil(n)
    return {
      months,
      years: months / 12,
    }
  },

  /**
   * Calculate the total interest paid over the life of a loan (client-side calculation)
   * @param principal The loan principal amount
   * @param annualRate The annual interest rate (as percentage, e.g., 5.5 for 5.5%)
   * @param monthlyPayment The monthly payment amount
   * @returns The total interest paid
   */
  calculateTotalInterestPaid(
    principal: number,
    annualRate: number,
    monthlyPayment: number
  ): number {
    if (principal <= 0 || monthlyPayment <= 0) {
      return 0
    }

    const monthlyRate = annualRate / 100 / 12

    // If payment is too small to cover interest
    if (monthlyPayment <= principal * monthlyRate) {
      return Infinity // Will never be paid off
    }

    // Get the term in months
    const term = this.calculateLoanTerm(principal, annualRate, monthlyPayment)
    const months = term.months

    // Calculate total payments and subtract principal to get interest
    const totalPayments = monthlyPayment * months
    const totalInterest = totalPayments - principal

    return Math.max(0, totalInterest) // Ensure non-negative
  },

  /**
   * Generate an amortization schedule locally (client-side calculation)
   * This serves as a fallback if the API request fails
   */
  generateAmortizationScheduleLocal(
    principal: number,
    annualRate: number,
    monthlyPayment: number,
    extraPayment: number = 0
  ): AmortizationEntry[] {
    const schedule: AmortizationEntry[] = []
    let balance = principal
    const monthlyRate = annualRate / 100 / 12

    // Start date for payments (first of next month)
    const startDate = new Date()
    startDate.setDate(1)
    startDate.setMonth(startDate.getMonth() + 1)

    let month = 1

    // Generate schedule until balance is paid off or 30 years (360 payments) for safety
    while (balance > 0 && month <= 360) {
      // Calculate interest for this period
      const interestPayment = balance * monthlyRate

      // Calculate principal portion of regular payment (cannot exceed balance)
      const principalPayment = Math.min(
        monthlyPayment - interestPayment,
        balance
      )

      // Calculate extra payment (cannot exceed remaining balance)
      const actualExtraPayment = Math.min(
        extraPayment,
        balance - principalPayment
      )

      // Calculate total principal payment (regular + extra)
      const totalPrincipalPayment = principalPayment + actualExtraPayment

      // Calculate total payment
      const totalPayment = interestPayment + totalPrincipalPayment

      // Update remaining balance
      balance = Math.max(0, balance - totalPrincipalPayment)

      // Create payment date
      const paymentDate = new Date(startDate)
      paymentDate.setMonth(startDate.getMonth() + month - 1)

      // Add to schedule
      schedule.push({
        month,
        payment_date: paymentDate.toISOString().split('T')[0],
        payment: totalPayment,
        principal_payment: totalPrincipalPayment,
        interest_payment: interestPayment,
        extra_payment: actualExtraPayment,
        remaining_balance: balance,
      })

      // Stop if balance is very close to zero
      if (balance < 0.01) {
        balance = 0
      }

      month++
    }

    return schedule
  },
}
