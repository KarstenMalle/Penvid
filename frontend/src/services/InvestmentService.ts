// frontend/src/services/InvestmentService.ts

import { createClient } from '@/lib/supabase-browser'
import { Currency } from '@/i18n/config'

export interface InvestmentPortfolio {
  id: string
  name: string
  description?: string
  goal_amount?: number
  target_date?: string
  created_at?: string
  updated_at?: string
}

export enum InvestmentType {
  STOCK = 'STOCK',
  BOND = 'BOND',
  ETF = 'ETF',
  CRYPTO = 'CRYPTO',
  REAL_ESTATE = 'REAL_ESTATE',
  OTHER = 'OTHER',
}

export interface Investment {
  id: string
  portfolio_id: string
  name: string
  symbol?: string
  type: InvestmentType
  purchase_date: string
  amount: number
  purchase_price: number
  current_price?: number
  last_updated?: string
  notes?: string
}

export interface InvestmentTransaction {
  id: string
  investment_id: string
  transaction_date: string
  transaction_type: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT' | 'OTHER'
  amount: number
  price: number
  fees?: number
  notes?: string
}

export interface InvestmentSummary {
  total_invested: number
  current_value: number
  total_gain_loss: number
  total_gain_loss_percentage: number
  portfolio_count: number
  investment_count: number
  investment_types: Record<string, number>
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
 * Service for managing investments and portfolios
 */
export const InvestmentService = {
  /**
   * Get all investment portfolios for a user
   */
  async getUserPortfolios(userId: string): Promise<InvestmentPortfolio[]> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/portfolios`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error in getUserPortfolios:', error)
      return []
    }
  },

  /**
   * Create a new investment portfolio
   */
  async createPortfolio(
    userId: string,
    portfolio: Partial<InvestmentPortfolio>
  ): Promise<InvestmentPortfolio | null> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/portfolios`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(portfolio),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || null
    } catch (error) {
      console.error('Error in createPortfolio:', error)
      return null
    }
  },

  /**
   * Get all investments in a portfolio
   */
  async getPortfolioInvestments(
    userId: string,
    portfolioId: string
  ): Promise<Investment[]> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/portfolios/${portfolioId}/investments`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error in getPortfolioInvestments:', error)
      return []
    }
  },

  /**
   * Add an investment to a portfolio
   */
  async addInvestment(
    userId: string,
    portfolioId: string,
    investment: Partial<Investment>
  ): Promise<Investment | null> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/portfolios/${portfolioId}/investments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(investment),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || null
    } catch (error) {
      console.error('Error in addInvestment:', error)
      return null
    }
  },

  /**
   * Update an existing investment
   */
  async updateInvestment(
    userId: string,
    investmentId: string,
    investment: Partial<Investment>
  ): Promise<Investment | null> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/investments/${investmentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(investment),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || null
    } catch (error) {
      console.error('Error in updateInvestment:', error)
      return null
    }
  },

  /**
   * Delete an investment
   */
  async deleteInvestment(
    userId: string,
    investmentId: string
  ): Promise<boolean> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/investments/${investmentId}`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Error in deleteInvestment:', error)
      return false
    }
  },

  /**
   * Get investment summary for a user
   */
  async getUserInvestmentSummary(
    userId: string
  ): Promise<InvestmentSummary | null> {
    try {
      const token = await getAuthToken()
      // Call backend API directly
      const response = await fetch(
        `${API_BASE_URL}/api/user/${userId}/investment-summary`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || null
    } catch (error) {
      console.error('Error in getUserInvestmentSummary:', error)
      return null
    }
  },

  /**
   * Get all transactions for an investment
   */
  async getInvestmentTransactions(
    userId: string,
    investmentId: string
  ): Promise<InvestmentTransaction[]> {
    try {
      const supabase = createClient()

      // Query transactions from Supabase directly
      const { data, error } = await supabase
        .from('investment_transactions')
        .select('*')
        .eq('investment_id', investmentId)
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error in getInvestmentTransactions:', error)
      return []
    }
  },

  /**
   * Add a transaction for an investment
   */
  async addTransaction(
    userId: string,
    transaction: Partial<InvestmentTransaction>
  ): Promise<InvestmentTransaction | null> {
    try {
      const supabase = createClient()

      // Add user_id to transaction data
      const transactionData = {
        ...transaction,
        user_id: userId,
        created_at: new Date().toISOString(),
      }

      // Insert transaction
      const { data, error } = await supabase
        .from('investment_transactions')
        .insert(transactionData)
        .select()
        .single()

      if (error) throw error

      return data || null
    } catch (error) {
      console.error('Error in addTransaction:', error)
      return null
    }
  },
}
