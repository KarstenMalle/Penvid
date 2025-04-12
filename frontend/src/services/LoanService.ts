// frontend/src/services/LoanService.ts

import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { ApiClient } from './ApiClient'

/**
 * Service for managing loans via backend API
 * All currency conversion is handled by the backend
 */
export class LoanService {
  // Cache for loan data with a longer timeout (5 minutes)
  private static loanCache: { [userId: string]: { data: Loan[], timestamp: number } } = {};
  private static CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Track pending requests to avoid duplicate calls
  private static pendingLoansRequest: { [userId: string]: Promise<Loan[]> } = {};

  /**
   * Get all loans for a user
   * Loans will be returned in the user's preferred currency
   */
  static async getUserLoans(userId: string, currency?: string): Promise<Loan[]> {
    // Check cache first
    const cachedData = this.loanCache[userId];
    if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_TIMEOUT) {
      console.log(`Using cached loans for user ${userId}`);
      return cachedData.data;
    }

    // If there's already a pending request for this user, return it
    if (userId in this.pendingLoansRequest) {
      console.log(`Using existing request for user ${userId}`);
      return this.pendingLoansRequest[userId];
    }

    try {
      // Create the promise for this request
      this.pendingLoansRequest[userId] = this.fetchUserLoans(userId, currency);
      
      // Wait for the request to complete
      const result = await this.pendingLoansRequest[userId];
      
      // Update cache with new data
      this.loanCache[userId] = {
        data: result,
        timestamp: Date.now()
      };
      
      return result;
    } catch (error) {
      // Clear the pending request on error
      delete this.pendingLoansRequest[userId];
      console.error('Error getting user loans:', error);
      throw error;
    } finally {
      // Clear the pending request after a short delay
      setTimeout(() => {
        delete this.pendingLoansRequest[userId];
      }, 1000); // Increased to 1 second
    }
  }

  // Actual fetch implementation with improved error handling
  private static async fetchUserLoans(userId: string, currency?: string): Promise<Loan[]> {
    try {
      // Add retry logic for network issues
      const maxRetries = 3;
      let currentRetry = 0;
      let lastError;

      while (currentRetry < maxRetries) {
        try {
          const response = await ApiClient.get<Loan[]>(
            `/api/user/${userId}/loans`,
            {
              requiresAuth: true,
            }
          );

          // Check if response is valid
          if (!response || typeof response !== 'object') {
            throw new Error('Invalid API response format');
          }

          // Check for error in response
          if (response.status === 'error' || response.error) {
            throw new Error(
              typeof response.error === 'string'
                ? response.error
                : response.error?.message || 'Failed to fetch loans'
            );
          }

          // Ensure data is an array
          if (!Array.isArray(response.data)) {
            throw new Error('Invalid loans data format');
          }

          // Successfully fetched loans
          return response.data;
        } catch (error) {
          lastError = error;
          console.warn(`Retry ${currentRetry + 1}/${maxRetries} failed:`, error);
          currentRetry++;

          // Wait before retry (exponential backoff)
          if (currentRetry < maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, currentRetry))
            );
          }
        }
      }

      // If we got here, all retries failed
      console.error('Error getting user loans after retries:', lastError);
      throw lastError;
    } catch (error) {
      console.error('Error getting user loans:', error);
      throw error;
    }
  }

  /**
   * Clear the loan cache for a specific user
   */
  static clearCache(userId?: string) {
    if (userId) {
      delete this.loanCache[userId];
    } else {
      this.loanCache = {};
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
      console.log(`Attempting to create default loan for user ${userId}`)
      
      const response = await ApiClient.post<Loan>(
        `/api/user/${userId}/loans/default`,
        {},
        {
          requiresAuth: true,
        }
      )

      console.log(`Default loan creation response:`, response)

      if (response.status === 'error') {
        console.error('Error creating default loan:', response.error)
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Failed to create default loan'
        )
      }

      // If a loan was created, return it
      if (response.data) {
        console.log(`Default loan created successfully:`, response.data)
        return response.data
      }

      // No loan was created (user already has loans)
      console.log('Default loan not created, user may already have loans')
      return null
    } catch (error) {
      console.error('Error creating default loan:', error)
      // Return null instead of throwing to make error handling easier
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
