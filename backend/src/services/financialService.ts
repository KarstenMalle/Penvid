import supabase from '../config/supabase';
import logger from '../utils/logger';
import { convertCurrency, SupportedCurrency, BASE_CURRENCY } from './currencyService';
import { getUserProfile } from './userService';

/**
 * Interface for common fields across financial data
 */
interface BaseFinancialData {
  id: string;
  user_id: string;
  // Add currency field that will be computed dynamically
  currency?: SupportedCurrency;
}

/**
 * Interface for account data
 */
export interface Account extends BaseFinancialData {
  name: string;
  type: string;
  balance: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for transaction data
 */
export interface Transaction extends BaseFinancialData {
  account_id: string;
  amount: number;
  description: string;
  category: string;
  transaction_date: string;
  created_at: string;
}

/**
 * Interface for loan data
 */
export interface Loan extends BaseFinancialData {
  loan_id: number;
  name: string;
  balance: number;
  interest_rate: number;
  term_years: number;
  minimum_payment: number;
  created_at: string;
  updated_at: string;
  loan_type: string;
  priority: string;
}

/**
 * Interface for investment data
 */
export interface Investment extends BaseFinancialData {
  portfolio_id: string;
  name: string;
  symbol: string;
  type: string;
  purchase_date: string;
  amount: number;
  purchase_price: number;
  current_price: number;
  last_updated: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for goal data
 */
export interface Goal extends BaseFinancialData {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Helper function to convert financial amounts to the user's preferred currency
 */
async function convertFinancialData<T extends BaseFinancialData>(
  data: T[],
  userId: string,
  moneyFields: string[] = ['balance', 'amount', 'target_amount', 'current_amount', 'purchase_price', 'current_price', 'minimum_payment']
): Promise<T[]> {
  // Get user's currency preference
  const userProfile = await getUserProfile(userId);

  if (!userProfile) {
    logger.error(`User profile not found for user ${userId}`);
    return data;
  }

  const targetCurrency = userProfile.currency_preference || BASE_CURRENCY;

  // Process each item
  const processedData = await Promise.all(
    data.map(async (item) => {
      const itemCopy = { ...item } as T;

      // Set the currency field
      itemCopy.currency = targetCurrency;

      // Convert each money field if it exists in the item
      for (const field of moneyFields) {
        if (field in itemCopy && typeof (itemCopy as any)[field] === 'number') {
          const sourceCurrency = (item as any).currency || BASE_CURRENCY;
          (itemCopy as any)[field] = await convertCurrency(
            (itemCopy as any)[field],
            sourceCurrency as SupportedCurrency,
            targetCurrency
          );
        }
      }

      return itemCopy;
    })
  );

  return processedData;
}

/**
 * Get user accounts with converted currencies
 */
export async function getUserAccounts(userId: string): Promise<Account[]> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error(`Error fetching accounts for user ${userId}:`, error);
      throw new Error(`Error fetching accounts: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert currency values
    return await convertFinancialData<Account>(data, userId);
  } catch (error) {
    logger.error(`Unexpected error fetching accounts for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get user transactions with converted currencies
 */
export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (error) {
      logger.error(`Error fetching transactions for user ${userId}:`, error);
      throw new Error(`Error fetching transactions: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert currency values
    return await convertFinancialData<Transaction>(data, userId);
  } catch (error) {
    logger.error(`Unexpected error fetching transactions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get user loans with converted currencies
 */
export async function getUserLoans(userId: string): Promise<Loan[]> {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error(`Error fetching loans for user ${userId}:`, error);
      throw new Error(`Error fetching loans: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert currency values
    return await convertFinancialData<Loan>(data, userId);
  } catch (error) {
    logger.error(`Unexpected error fetching loans for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get user investments with converted currencies
 */
export async function getUserInvestments(userId: string): Promise<Investment[]> {
  try {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error(`Error fetching investments for user ${userId}:`, error);
      throw new Error(`Error fetching investments: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert currency values
    return await convertFinancialData<Investment>(data, userId);
  } catch (error) {
    logger.error(`Unexpected error fetching investments for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get user goals with converted currencies
 */
export async function getUserGoals(userId: string): Promise<Goal[]> {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error(`Error fetching goals for user ${userId}:`, error);
      throw new Error(`Error fetching goals: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert currency values
    return await convertFinancialData<Goal>(data, userId);
  } catch (error) {
    logger.error(`Unexpected error fetching goals for user ${userId}:`, error);
    throw error;
  }
}

export default {
  getUserAccounts,
  getUserTransactions,
  getUserLoans,
  getUserInvestments,
  getUserGoals,
};