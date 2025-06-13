import { apiClient } from './ApiClient'
import { API_ENDPOINTS } from '@/config/api'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'

export class LoanService {
  /**
   * Get all loans for a user
   */
  static async getUserLoans(
    userId: string,
    currency?: string
  ): Promise<Loan[]> {
    try {
      const response = await apiClient.get<{ loans: any[] }>(
        `/api/loans/${userId}`,
        { params: { currency } }
      )

      if (response.success && response.data?.loans) {
        return response.data.loans.map(this.transformLoan)
      }

      return []
    } catch (error) {
      console.error('Error fetching user loans:', error)
      return []
    }
  }

  /**
   * Save user loans
   */
  static async saveUserLoans(userId: string, loans: Loan[]): Promise<void> {
    try {
      const response = await apiClient.post(`/api/loans/${userId}`, { loans })

      if (!response.success) {
        throw new Error(response.error || 'Failed to save loans')
      }
    } catch (error) {
      console.error('Error saving loans:', error)
      throw error
    }
  }

  /**
   * Update a single loan
   */
  static async updateLoan(userId: string, loan: Loan): Promise<void> {
    try {
      const response = await apiClient.put(
        `/api/loans/${userId}/${loan.id}`,
        loan
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to update loan')
      }
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
      const response = await apiClient.delete(`/api/loans/${userId}/${loanId}`)

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete loan')
      }
    } catch (error) {
      console.error('Error deleting loan:', error)
      throw error
    }
  }

  /**
   * Create a default loan for new users
   */
  static async createDefaultLoan(userId: string): Promise<Loan | null> {
    try {
      const defaultLoan: Loan = {
        id: 1,
        name: 'Example Loan',
        balance: 10000,
        interestRate: 5.0,
        termYears: 5,
        minimumPayment: 200,
        loanType: LoanType.PERSONAL,
      }

      await this.saveUserLoans(userId, [defaultLoan])
      return defaultLoan
    } catch (error) {
      console.error('Error creating default loan:', error)
      return null
    }
  }

  /**
   * Transform backend loan data to frontend format
   */
  private static transformLoan(backendLoan: any): Loan {
    return {
      id: backendLoan.loan_id || backendLoan.id,
      name: backendLoan.name,
      balance: Number(backendLoan.balance),
      interestRate: Number(backendLoan.interest_rate),
      termYears: Number(backendLoan.term_years),
      minimumPayment: Number(backendLoan.minimum_payment),
      loanType: backendLoan.loan_type as LoanType,
    }
  }
}
