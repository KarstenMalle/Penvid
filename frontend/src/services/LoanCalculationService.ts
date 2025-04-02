// frontend/src/services/LoanCalculationService.ts

import { createClient } from '@/lib/supabase-browser'
import { Currency } from '@/i18n/config'

export interface LoanCalculationRequest {
  principal: number
  annual_rate: number
  term_years?: number
  monthly_payment?: number
  extra_payment?: number
  currency?: Currency
}

export interface LoanTerm {
  months: number
  years: number
}

export interface ExtraPaymentImpact {
  originalTerm: LoanTerm
  newTerm: LoanTerm
  monthsSaved: number
  interestSaved: number
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

export interface RecommendationRequest {
  loans: any[]
  monthly_available: number
  results: any
  optimal_strategy: any
  loan_comparisons: any[]
}

export interface Recommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export class LoanCalculationService {
  private static supabase = createClient()

  /**
   * Calculate various loan metrics based on provided parameters
   */
  static async calculateLoanDetails(
    request: LoanCalculationRequest
  ): Promise<LoanCalculationResponse> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'loans/calculate',
        {
          body: request,
        }
      )

      if (error)
        throw new Error(`Failed to calculate loan details: ${error.message}`)

      return data
    } catch (error) {
      console.error('Error in calculateLoanDetails:', error)

      // Fallback to simple calculations if API call fails
      const monthlyPayment =
        request.monthly_payment ||
        this.calculateMonthlyPayment(
          request.principal,
          request.annual_rate,
          request.term_years || 30
        )

      const loanTerm = this.calculateLoanTerm(
        request.principal,
        request.annual_rate,
        monthlyPayment
      )

      const totalInterest = this.calculateTotalInterest(
        request.principal,
        request.annual_rate,
        monthlyPayment
      )

      return {
        monthly_payment: monthlyPayment,
        loan_term: loanTerm,
        total_interest: totalInterest,
        // Amortization schedule would be too complex for fallback
      }
    }
  }

  /**
   * Generate personalized financial recommendations
   */
  static async generateRecommendations(
    request: RecommendationRequest
  ): Promise<Recommendation[]> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'recommendations',
        {
          body: request,
        }
      )

      if (error)
        throw new Error(`Failed to generate recommendations: ${error.message}`)

      return data
    } catch (error) {
      console.error('Error generating recommendations:', error)

      // Fallback recommendations
      return [
        {
          title: 'Follow the recommended strategy',
          description:
            'This strategy provides the best financial outcome based on your specific situation.',
          priority: 'high',
        },
        {
          title: 'Consider your risk tolerance',
          description:
            'Your personal comfort with risk should influence whether you prioritize guaranteed debt reduction or potentially higher investment returns.',
          priority: 'medium',
        },
        {
          title: 'Build an emergency fund first',
          description:
            'Before implementing any strategy, ensure you have 3-6 months of expenses saved for emergencies.',
          priority: 'high',
        },
      ]
    }
  }

  /**
   * Calculate amortization schedule for a loan
   */
  static async getAmortizationSchedule(
    loanId: number,
    principal: number,
    annualRate: number,
    monthlyPayment: number,
    extraPayment: number = 0,
    currency: Currency = 'USD'
  ): Promise<{
    schedule: AmortizationEntry[]
    total_interest_paid: number
    months_to_payoff: number
  }> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'loans/amortization',
        {
          body: {
            loan_id: loanId,
            principal,
            annual_rate: annualRate,
            monthly_payment: monthlyPayment,
            extra_payment: extraPayment,
            currency,
          },
        }
      )

      if (error)
        throw new Error(`Failed to get amortization schedule: ${error.message}`)

      return data
    } catch (error) {
      console.error('Error getting amortization schedule:', error)
      throw error
    }
  }

  /**
   * Fallback method to calculate monthly payment if API call fails
   */
  private static calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    years: number
  ): number {
    if (principal <= 0 || years <= 0) return 0

    const monthlyRate = annualRate / 12
    const numPayments = years * 12

    if (monthlyRate === 0) return principal / numPayments

    return (
      (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    )
  }

  /**
   * Fallback method to calculate loan term if API call fails
   */
  private static calculateLoanTerm(
    principal: number,
    annualRate: number,
    monthlyPayment: number
  ): LoanTerm {
    if (principal <= 0 || monthlyPayment <= 0) {
      return { months: 0, years: 0 }
    }

    const monthlyRate = annualRate / 12

    // If interest rate is 0, simple division
    if (monthlyRate === 0) {
      const months = Math.ceil(principal / monthlyPayment)
      return {
        months,
        years: Math.floor(months / 12),
      }
    }

    // For interest-bearing loans, use formula: n = -log(1 - P*r/PMT) / log(1 + r)
    // where n is number of payments, P is principal, r is monthly rate, PMT is payment

    // Check if payment covers interest
    if (monthlyPayment <= principal * monthlyRate) {
      return { months: Infinity, years: Infinity }
    }

    const n =
      -Math.log(1 - (principal * monthlyRate) / monthlyPayment) /
      Math.log(1 + monthlyRate)
    const months = Math.ceil(n)

    return {
      months,
      years: Math.floor(months / 12),
    }
  }

  /**
   * Fallback method to calculate total interest if API call fails
   */
  private static calculateTotalInterest(
    principal: number,
    annualRate: number,
    monthlyPayment: number
  ): number {
    if (principal <= 0 || monthlyPayment <= 0) {
      return 0
    }

    const monthlyRate = annualRate / 12

    // If interest rate is 0, no interest is paid
    if (monthlyRate === 0) {
      return 0
    }

    // If payment doesn't cover interest
    if (monthlyPayment <= principal * monthlyRate) {
      return Infinity
    }

    // Calculate payoff time
    const { months } = this.calculateLoanTerm(
      principal,
      annualRate,
      monthlyPayment
    )

    if (!isFinite(months)) {
      return Infinity
    }

    // Total amount paid
    const totalPaid = monthlyPayment * months

    // Total interest is the difference between total paid and principal
    return Math.max(0, totalPaid - principal)
  }
}
