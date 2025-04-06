// frontend/src/services/LoanService.ts

import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { ApiClient } from './ApiClient'

/**
 * Service for managing loans via backend API
 * All currency conversion is handled by the backend
 */
export class LoanService {
  /**
   * Get all loans for a user
   * Loans will be returned in the user's preferred currency
   */
  static async getUserLoans(userId: string): Promise<Loan[]> {
    try {
      const response = await ApiClient.get<Loan[]>(
        `/api/user/${userId}/loans`,
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error' || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to fetch loans'
        )
      }

      // Return the loans - already converted to user's currency by backend
      return response.data
    } catch (error) {
      console.error('Error getting user loans:', error)
      throw error
    }
  }

  /**
   * Get a specific loan by ID
   */
  static async getLoan(userId: string, loanId: number): Promise<Loan> {
    try {
      const response = await ApiClient.get<Loan>(
        `/api/user/${userId}/loan/${loanId}`,
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error' || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to fetch loan'
        )
      }

      // Return the loan - already converted to user's currency by backend
      return response.data
    } catch (error) {
      console.error('Error getting loan:', error)
      throw error
    }
  }

  /**
   * Save user loans (create or update multiple loans)
   */
  static async saveUserLoans(userId: string, loans: Loan[]): Promise<void> {
    try {
      const response = await ApiClient.post<any>(
        `/api/user/${userId}/loans`,
        loans,
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error') {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to save loans'
        )
      }
    } catch (error) {
      console.error('Error saving user loans:', error)
      throw error
    }
  }

  /**
   * Create a new loan
   */
  static async createLoan(userId: string, loan: Loan): Promise<Loan> {
    try {
      const response = await ApiClient.post<Loan>(
        `/api/user/${userId}/loan`,
        loan,
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error' || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to create loan'
        )
      }

      return response.data
    } catch (error) {
      console.error('Error creating loan:', error)
      throw error
    }
  }

  /**
   * Update a single loan
   */
  static async updateLoan(userId: string, loan: Loan): Promise<Loan> {
    try {
      const response = await ApiClient.put<Loan>(
        `/api/user/${userId}/loan/${loan.id}`,
        loan,
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error') {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to update loan'
        )
      }

      return response.data || loan
    } catch (error) {
      console.error('Error updating loan:', error)
      throw error
    }
  }

  /**
   * Delete a loan
   */
  static async deleteLoan(userId: string, loanId: number): Promise<void> {
    try {
      const response = await ApiClient.delete<any>(
        `/api/user/${userId}/loan/${loanId}`,
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error') {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to delete loan'
        )
      }
    } catch (error) {
      console.error('Error deleting loan:', error)
      throw error
    }
  }

  /**
   * Create a default loan if the user has none
   */
  static async createDefaultLoan(userId: string): Promise<Loan | null> {
    try {
      const response = await ApiClient.post<Loan>(
        `/api/user/${userId}/loans/default`,
        {},
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error') {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to create default loan'
        )
      }

      // If a loan was created, return it
      if (response.data) {
        return response.data
      }

      // No loan was created (user already has loans)
      return null
    } catch (error) {
      console.error('Error creating default loan:', error)
      return null
    }
  }

  /**
   * Calculate tax savings for a loan
   */
  static async calculateTaxSavings(
    userId: string,
    loanId: number,
    countryCode: string = 'US'
  ): Promise<any> {
    try {
      const response = await ApiClient.post<any>(
        '/api/loans/tax-savings',
        {
          user_id: userId,
          loan_id: loanId,
          country_code: countryCode,
        },
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error' || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to calculate tax savings'
        )
      }

      return response.data
    } catch (error) {
      console.error('Error calculating tax savings:', error)
      throw error
    }
  }

  /**
   * Get amortization schedule for a loan
   */
  static async getAmortizationSchedule(
    userId: string,
    loanId: number,
    extraPayment: number = 0,
    maxYears: number = 30
  ): Promise<any> {
    try {
      const response = await ApiClient.post<any>(
        `/api/user/${userId}/loan/${loanId}/amortization`,
        {
          extra_payment: extraPayment,
          max_years: maxYears,
        },
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error' || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to get amortization schedule'
        )
      }

      return response.data
    } catch (error) {
      console.error('Error getting amortization schedule:', error)
      throw error
    }
  }

  /**
   * Get detailed payment analysis for a loan
   */
  static async getPaymentAnalysis(
    userId: string,
    loanId: number,
    extraPayment: number = 0
  ): Promise<any> {
    try {
      const response = await ApiClient.post<any>(
        '/api/loans/payment-analysis',
        {
          user_id: userId,
          loan_id: loanId,
          extra_payment: extraPayment,
        },
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error' || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to get payment analysis'
        )
      }

      return response.data
    } catch (error) {
      console.error('Error getting payment analysis:', error)
      throw error
    }
  }

  /**
   * Calculate what-if scenarios for a loan
   */
  static async calculateWhatIfScenarios(
    userId: string,
    loanId: number,
    scenarios: any[]
  ): Promise<any> {
    try {
      const response = await ApiClient.post<any>(
        '/api/loans/what-if-scenarios',
        {
          user_id: userId,
          loan_id: loanId,
          scenarios: scenarios,
        },
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error' || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to calculate scenarios'
        )
      }

      return response.data
    } catch (error) {
      console.error('Error calculating what-if scenarios:', error)
      throw error
    }
  }

  /**
   * Calculate details for multiple loans at once
   */
  static async batchCalculateLoans(
    userId: string,
    loanIds: number[]
  ): Promise<any[]> {
    try {
      const response = await ApiClient.post<any[]>(
        '/api/loans/batch-calculate',
        {
          user_id: userId,
          loan_ids: loanIds,
        },
        {
          requiresAuth: true,
        }
      )

      if (response.status === 'error' || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to calculate loan details'
        )
      }

      return response.data
    } catch (error) {
      console.error('Error batch calculating loans:', error)
      throw error
    }
  }
}
