// frontend/src/services/LoanService.ts

import { createClient } from '@/lib/supabase-browser'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { FinancialApiService } from './FinancialApiService'

/**
 * Service for managing loans in Supabase
 */
export class LoanService {
  /**
   * Get all loans for a user
   */
  static async getUserLoans(
    userId: string,
    currency: string = 'USD'
  ): Promise<Loan[]> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .order('name')

      if (error) throw error

      // Convert loan data format
      return data.map((loan) => ({
        id: loan.loan_id,
        name: loan.name,
        balance: loan.balance,
        interestRate: loan.interest_rate,
        termYears: loan.term_years,
        minimumPayment: loan.minimum_payment,
        loanType: loan.loan_type || LoanType.OTHER,
      }))
    } catch (error) {
      console.error('Error getting user loans:', error)
      throw error
    }
  }

  /**
   * Save user loans (create or update multiple loans)
   */
  static async saveUserLoans(userId: string, loans: Loan[]): Promise<void> {
    try {
      const supabase = createClient()

      // Format loans for database
      const formattedLoans = loans.map((loan) => ({
        user_id: userId,
        loan_id: loan.id,
        name: loan.name,
        balance: loan.balance,
        interest_rate: loan.interestRate,
        term_years: loan.termYears,
        minimum_payment: loan.minimumPayment,
        loan_type: loan.loanType || LoanType.OTHER,
        updated_at: new Date().toISOString(),
      }))

      // Get existing loan IDs
      const { data: existingLoans, error: fetchError } = await supabase
        .from('loans')
        .select('loan_id')
        .eq('user_id', userId)

      if (fetchError) throw fetchError

      const existingLoanIds = existingLoans.map((loan) => loan.loan_id)

      // Determine which loans to insert and which to update
      const loansToInsert = formattedLoans.filter(
        (loan) => !existingLoanIds.includes(loan.loan_id)
      )
      const loansToUpdate = formattedLoans.filter((loan) =>
        existingLoanIds.includes(loan.loan_id)
      )

      // Insert new loans
      if (loansToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('loans')
          .insert(loansToInsert)

        if (insertError) throw insertError
      }

      // Update existing loans
      for (const loan of loansToUpdate) {
        const { error: updateError } = await supabase
          .from('loans')
          .update(loan)
          .eq('user_id', userId)
          .eq('loan_id', loan.loan_id)

        if (updateError) throw updateError
      }

      // Delete loans that are no longer in the list
      const currentLoanIds = formattedLoans.map((loan) => loan.loan_id)
      const loanIdsToDelete = existingLoanIds.filter(
        (id) => !currentLoanIds.includes(id)
      )

      if (loanIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('loans')
          .delete()
          .eq('user_id', userId)
          .in('loan_id', loanIdsToDelete)

        if (deleteError) throw deleteError
      }
    } catch (error) {
      console.error('Error saving user loans:', error)
      throw error
    }
  }

  /**
   * Update a single loan
   */
  static async updateLoan(userId: string, loan: Loan): Promise<void> {
    try {
      const supabase = createClient()

      const formattedLoan = {
        user_id: userId,
        loan_id: loan.id,
        name: loan.name,
        balance: loan.balance,
        interest_rate: loan.interestRate,
        term_years: loan.termYears,
        minimum_payment: loan.minimumPayment,
        loan_type: loan.loanType || LoanType.OTHER,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('loans')
        .upsert(formattedLoan)
        .eq('user_id', userId)
        .eq('loan_id', loan.id)

      if (error) throw error
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
      const supabase = createClient()

      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('user_id', userId)
        .eq('loan_id', loanId)

      if (error) throw error
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
      const supabase = createClient()

      // First check if user already has loans
      const { data: existingLoans, error: fetchError } = await supabase
        .from('loans')
        .select('loan_id')
        .eq('user_id', userId)
        .limit(1)

      if (fetchError) throw fetchError

      // If user already has loans, don't create a default
      if (existingLoans && existingLoans.length > 0) {
        return null
      }

      // Default loan
      const defaultLoan = {
        user_id: userId,
        loan_id: 1,
        name: 'Student Loan',
        balance: 25000,
        interest_rate: 5.8,
        term_years: 10,
        minimum_payment: 275,
        loan_type: LoanType.STUDENT,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase
        .from('loans')
        .insert(defaultLoan)

      if (insertError) throw insertError

      // Return formatted loan for frontend
      return {
        id: defaultLoan.loan_id,
        name: defaultLoan.name,
        balance: defaultLoan.balance,
        interestRate: defaultLoan.interest_rate,
        termYears: defaultLoan.term_years,
        minimumPayment: defaultLoan.minimum_payment,
        loanType: defaultLoan.loan_type,
      }
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
    loan: Loan,
    countryCode: string = 'US'
  ): Promise<any> {
    // This would call an API endpoint to calculate tax savings
    // For now, return mock data based on loan type and country code

    // This is a temporary implementation that would be replaced with an API call
    const isDeductible = [
      'MORTGAGE',
      'MORTGAGE_BOND',
      'HOME_LOAN',
      'STUDENT',
    ].includes(loan.loanType || 'OTHER')
    const deductionRate = countryCode === 'DK' ? 0.33 : 0.25
    const annualInterest = loan.balance * (loan.interestRate / 100)
    const estimatedSavings = isDeductible ? annualInterest * deductionRate : 0

    return {
      tax_deductible: isDeductible,
      deduction_rate: deductionRate,
      deduction_cap:
        countryCode === 'US' && loan.loanType === 'MORTGAGE' ? 750000 : null,
      annual_interest: annualInterest,
      estimated_tax_savings: estimatedSavings,
      recommendations: isDeductible
        ? [
            'Remember to include loan interest in your tax return',
            'Keep detailed records of all interest payments',
            'Consider consulting a tax professional for optimal tax strategies',
          ]
        : null,
    }
  }
}
