// User profile related types
export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  language_preference: string | null
  currency_preference: string
  country_preference: string | null
  created_at: string
  updated_at: string | null
}

export interface ProfileUpdate {
  name?: string | null
  avatar_url?: string | null
  language_preference?: string | null
  currency_preference?: string
  country_preference?: string | null
}

// Financial data types
export interface Account {
  id: string
  user_id: string
  name: string
  type: string
  balance: number
  is_primary: boolean
  created_at: string
  updated_at: string
  currency?: string
}

export interface Transaction {
  id: string
  account_id: string
  user_id: string
  amount: number
  description: string
  category: string
  transaction_date: string
  created_at: string
  currency?: string
}

export interface Loan {
  id: string
  user_id: string
  loan_id: number
  name: string
  balance: number
  interest_rate: number
  term_years: number
  minimum_payment: number
  created_at: string
  updated_at: string
  loan_type: string
  priority: string
  currency?: string
}

export interface Investment {
  id: string
  portfolio_id: string
  user_id: string
  name: string
  symbol: string
  type: string
  purchase_date: string
  amount: number
  purchase_price: number
  current_price: number
  last_updated: string
  notes: string | null
  created_at: string
  updated_at: string
  currency?: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
  currency?: string
}

// Currency related types
export interface CurrencyConversion {
  amount: number
  fromCurrency: string
  toCurrency: string
}

export interface ConversionResult {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  convertedCurrency: string
}

// Authentication related types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  message: string
  user: {
    id: string
    email: string
  }
  session?: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  password: string
  token: string
}
