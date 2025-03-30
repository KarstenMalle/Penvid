import { createClient } from '@/lib/supabase-browser'
import {
  Loan,
  LoanType,
  LoanPriority,
} from '@/components/features/wealth-optimizer/types'

// Define the shape of the loan data in Supabase
interface SupabaseLoan {
  id?: string
  user_id: string
  loan_id: number
  name: string
  balance: number
  interest_rate: number
  term_years: number
  minimum_payment: number
  loan_type?: string
  priority?: string
  created_at?: string
  updated_at?: string
}

// Convert from Supabase format to application format
const mapFromSupabase = (loan: SupabaseLoan): Loan => ({
  id: loan.loan_id,
  name: loan.name,
  balance: loan.balance,
  interestRate: loan.interest_rate,
  termYears: loan.term_years,
  minimumPayment: loan.minimum_payment,
  loanType: (loan.loan_type as LoanType) || LoanType.PERSONAL,
  priority: (loan.priority as LoanPriority) || 'medium',
})

// Convert from application format to Supabase format
const mapToSupabase = (loan: Loan, userId: string): SupabaseLoan => ({
  user_id: userId,
  loan_id: loan.id,
  name: loan.name,
  balance: loan.balance,
  interest_rate: loan.interestRate,
  term_years: loan.termYears,
  minimum_payment: loan.minimumPayment,
  loan_type: loan.loanType || LoanType.PERSONAL,
  priority: loan.priority || 'medium',
  updated_at: new Date().toISOString(),
})

/**
 * Service for managing loans in Supabase
 */
export const LoanService = {
  /**
   * Get all loans for a user
   */
  async getUserLoans(userId: string): Promise<Loan[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .order('loan_id', { ascending: true })

      if (error) {
        console.error('Error fetching loans:', error)
        return []
      }

      return data ? data.map(mapFromSupabase) : []
    } catch (error) {
      console.error('Unexpected error fetching loans:', error)
      return []
    }
  },

  /**
   * Save all loans for a user (create, update, or delete as needed)
   */
  async saveUserLoans(userId: string, loans: Loan[]): Promise<boolean> {
    try {
      const supabase = createClient()

      // Get existing loans to determine which to update/delete
      const { data: existingLoans, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) {
        console.error('Error fetching existing loans:', fetchError)
        return false
      }

      // Map existing loans by their id for easy lookup
      const existingLoanMap = new Map<number, SupabaseLoan>()
      existingLoans?.forEach((loan) => {
        existingLoanMap.set(loan.loan_id, loan)
      })

      // Prepare operations
      const loansToCreate: SupabaseLoan[] = []
      const loansToUpdate: SupabaseLoan[] = []
      const loanIdsToKeep = new Set<number>()

      // Determine which loans to create or update
      loans.forEach((loan) => {
        loanIdsToKeep.add(loan.id)
        const existingLoan = existingLoanMap.get(loan.id)

        if (existingLoan) {
          // Update existing loan
          loansToUpdate.push({
            ...mapToSupabase(loan, userId),
            id: existingLoan.id, // Use the Supabase record ID
          })
        } else {
          // Create new loan
          loansToCreate.push(mapToSupabase(loan, userId))
        }
      })

      // Determine which loans to delete (those that exist in DB but not in current list)
      const loanIdsToDelete =
        existingLoans
          ?.filter((loan) => !loanIdsToKeep.has(loan.loan_id))
          .map((loan) => loan.id) || []

      // Execute operations in sequential order to avoid race conditions
      try {
        // Create new loans
        if (loansToCreate.length > 0) {
          const { error } = await supabase.from('loans').insert(loansToCreate)
          if (error) throw error
        }

        // Update existing loans one by one to avoid conflicts
        for (const loan of loansToUpdate) {
          const { error } = await supabase
            .from('loans')
            .update(loan)
            .eq('id', loan.id)
          if (error) throw error
        }

        // Delete removed loans
        if (loanIdsToDelete.length > 0) {
          const { error } = await supabase
            .from('loans')
            .delete()
            .in('id', loanIdsToDelete)
          if (error) throw error
        }

        return true
      } catch (error) {
        console.error('Error during loan operations:', error)
        return false
      }
    } catch (error) {
      console.error('Unexpected error saving loans:', error)
      return false
    }
  },

  /**
   * Get a single loan by ID
   */
  async getLoanById(userId: string, loanId: number): Promise<Loan | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .eq('loan_id', loanId)
        .single()

      if (error) {
        console.error('Error fetching loan:', error)
        return null
      }

      return data ? mapFromSupabase(data) : null
    } catch (error) {
      console.error('Unexpected error fetching loan:', error)
      return null
    }
  },

  /**
   * Update a single loan
   */
  async updateLoan(userId: string, loan: Loan): Promise<boolean> {
    try {
      const supabase = createClient()

      // Get the Supabase ID for this loan
      const { data: existingLoan, error: fetchError } = await supabase
        .from('loans')
        .select('id')
        .eq('user_id', userId)
        .eq('loan_id', loan.id)
        .single()

      if (fetchError) {
        console.error('Error fetching existing loan:', fetchError)
        return false
      }

      if (!existingLoan) {
        console.error('Loan not found:', loan.id)
        return false
      }

      // Update the loan
      const { error } = await supabase
        .from('loans')
        .update({
          ...mapToSupabase(loan, userId),
          id: existingLoan.id, // Use the Supabase record ID
        })
        .eq('id', existingLoan.id)

      if (error) {
        console.error('Error updating loan:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Unexpected error updating loan:', error)
      return false
    }
  },

  /**
   * Delete a single loan
   */
  async deleteLoan(userId: string, loanId: number): Promise<boolean> {
    try {
      const supabase = createClient()

      // Find the Supabase ID for this loan
      const { data: existingLoan, error: fetchError } = await supabase
        .from('loans')
        .select('id')
        .eq('user_id', userId)
        .eq('loan_id', loanId)
        .single()

      if (fetchError) {
        console.error('Error fetching existing loan:', fetchError)
        return false
      }

      if (!existingLoan) {
        console.error('Loan not found:', loanId)
        return false
      }

      // Delete the loan
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', existingLoan.id)

      if (error) {
        console.error('Error deleting loan:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Unexpected error deleting loan:', error)
      return false
    }
  },

  /**
   * Create a default loan for new users
   */
  async createDefaultLoan(userId: string): Promise<Loan | null> {
    try {
      const defaultLoan: Loan = {
        id: 1,
        name: 'Student Loan',
        balance: 25000,
        interestRate: 5.8,
        termYears: 10,
        minimumPayment: 275,
        loanType: LoanType.STUDENT,
        priority: 'medium',
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('loans')
        .insert(mapToSupabase(defaultLoan, userId))
        .select()
        .single()

      if (error) {
        console.error('Error creating default loan:', error)
        return null
      }

      return mapFromSupabase(data)
    } catch (error) {
      console.error('Unexpected error creating default loan:', error)
      return null
    }
  },
}
