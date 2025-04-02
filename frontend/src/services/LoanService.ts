// frontend/src/services/LoanService.ts

import { createClient } from '@/lib/supabase-browser'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import { Currency } from '@/i18n/config'
import { FinancialApiService } from './FinancialApiService'

export class LoanService {
  static async getUserLoans(
    userId: string,
    currency: Currency = 'USD'
  ): Promise<Loan[]> {
    const supabase = createClient()

    try {
      // Try to get loans from our new backend first
      try {
        console.log('Attempting to fetch loans from API...')
        const financialOverview =
          await FinancialApiService.getFinancialOverview(userId)

        if (financialOverview.loans && financialOverview.loans.length > 0) {
          console.log(
            'Successfully fetched loans from API:',
            financialOverview.loans
          )
          return financialOverview.loans.map((loan) => ({
            id: loan.loan_id,
            name: loan.name,
            balance: loan.balance,
            interestRate: loan.interest_rate * 100, // Convert decimal to percentage
            termYears: loan.term_years,
            minimumPayment: loan.minimum_payment,
            loanType: (loan.loan_type as LoanType) || LoanType.OTHER,
          }))
        } else {
          console.warn(
            'API returned empty loans array, falling back to Supabase'
          )
        }
      } catch (apiError) {
        console.warn(
          'Could not fetch loans from API, falling back to Supabase',
          apiError
        )
      }

      // Fall back to direct Supabase query if API is unavailable
      console.log('Fetching loans directly from Supabase...')
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.log('No loans found in Supabase')
        return []
      }

      console.log('Successfully fetched loans from Supabase:', data)
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
      console.error('Error fetching user loans:', error)
      // Return an empty array rather than throwing
      return []
    }
  }

  static async saveUserLoans(
    userId: string,
    loans: Loan[],
    currency: Currency = 'USD'
  ): Promise<boolean> {
    const supabase = createClient()

    try {
      // First delete all loans for this user to prepare for the new set
      const { error: deleteError } = await supabase
        .from('loans')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      // Insert the new loans
      const loanInserts = loans.map((loan) => ({
        user_id: userId,
        loan_id: loan.id,
        name: loan.name,
        balance: loan.balance,
        interest_rate: loan.interestRate,
        term_years: loan.termYears,
        minimum_payment: loan.minimumPayment,
        loan_type: loan.loanType || LoanType.OTHER,
      }))

      const { error: insertError } = await supabase
        .from('loans')
        .insert(loanInserts)

      if (insertError) throw insertError

      return true
    } catch (error) {
      console.error('Error saving user loans:', error)
      return false
    }
  }

  static async updateLoan(
    userId: string,
    loan: Loan,
    currency: Currency = 'USD'
  ): Promise<boolean> {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('loans')
        .update({
          name: loan.name,
          balance: loan.balance,
          interest_rate: loan.interestRate,
          term_years: loan.termYears,
          minimum_payment: loan.minimumPayment,
          loan_type: loan.loanType || LoanType.OTHER,
        })
        .eq('user_id', userId)
        .eq('loan_id', loan.id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error updating loan:', error)
      return false
    }
  }

  static async deleteLoan(userId: string, loanId: number): Promise<boolean> {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('user_id', userId)
        .eq('loan_id', loanId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deleting loan:', error)
      return false
    }
  }

  static async createDefaultLoan(
    userId: string,
    currency: Currency = 'USD'
  ): Promise<Loan | null> {
    const supabase = createClient()

    // Create a default loan for new users
    const defaultLoan = {
      user_id: userId,
      loan_id: 1,
      name: 'Student Loan',
      balance: 25000,
      interest_rate: 5.8,
      term_years: 10,
      minimum_payment: 275,
      loan_type: LoanType.STUDENT,
    }

    try {
      const { error } = await supabase.from('loans').insert(defaultLoan)

      if (error) throw error

      // Return the created loan
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
}
