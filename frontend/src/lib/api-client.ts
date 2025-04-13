import axios, { AxiosError, AxiosResponse } from 'axios'
import {
  ProfileUpdate,
  Profile,
  Account,
  Transaction,
  Goal,
  Investment,
} from './api-types'

// Define API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Create a base API instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to attach auth token
api.interceptors.request.use(
  (config) => {
    // Get token from local storage
    let token = ''

    if (typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token') || ''
    }

    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Redirect to login page if not already there
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        console.log('Authentication error: redirecting to login')
        localStorage.removeItem('auth')
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Generic API request function with error handling
async function apiRequest<T>(
  method: string,
  url: string,
  data?: any,
  options?: any
): Promise<T> {
  try {
    const response = await api.request({
      method,
      url,
      data,
      ...options,
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Format error message for display
      const errorMessage =
        error.response?.data?.message || error.message || 'An error occurred'
      console.error(`API Error (${method} ${url}):`, errorMessage)
      throw new Error(errorMessage)
    }
    console.error(`Unexpected error (${method} ${url}):`, error)
    throw error
  }
}

// API service object with all endpoints
const apiService = {
  // Profile endpoints
  getProfile: () => apiRequest<Profile>('GET', '/profile'),
  updateProfile: (data: ProfileUpdate) =>
    apiRequest<Profile>('PATCH', '/profile', data),

  // Currency endpoints
  getSupportedCurrencies: () => apiRequest<string[]>('GET', '/currencies'),
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string) =>
    apiRequest('POST', '/currencies/convert', {
      amount,
      fromCurrency,
      toCurrency,
    }),

  // Financial endpoints
  getAccounts: () => apiRequest<Account[]>('GET', '/financial/accounts'),
  getTransactions: () =>
    apiRequest<Transaction[]>('GET', '/financial/transactions'),
  getLoans: () => apiRequest<any[]>('GET', '/financial/loans'),
  getInvestments: () =>
    apiRequest<Investment[]>('GET', '/financial/investments'),
  getGoals: () => apiRequest<Goal[]>('GET', '/financial/goals'),

  // Create sample data
  createSampleData: () => apiRequest<boolean>('POST', '/financial/sample-data'),

  // Account operations
  createAccount: (data: Partial<Account>) =>
    apiRequest<Account>('POST', '/financial/accounts', data),
  updateAccount: (id: string, data: Partial<Account>) =>
    apiRequest<Account>('PUT', `/financial/accounts/${id}`, data),
  deleteAccount: (id: string) =>
    apiRequest<void>('DELETE', `/financial/accounts/${id}`),

  // Transaction operations
  createTransaction: (data: Partial<Transaction>) =>
    apiRequest<Transaction>('POST', '/financial/transactions', data),
  updateTransaction: (id: string, data: Partial<Transaction>) =>
    apiRequest<Transaction>('PUT', `/financial/transactions/${id}`, data),
  deleteTransaction: (id: string) =>
    apiRequest<void>('DELETE', `/financial/transactions/${id}`),

  // Goal operations
  createGoal: (data: Partial<Goal>) =>
    apiRequest<Goal>('POST', '/financial/goals', data),
  updateGoal: (id: string, data: Partial<Goal>) =>
    apiRequest<Goal>('PUT', `/financial/goals/${id}`, data),
  deleteGoal: (id: string) =>
    apiRequest<void>('DELETE', `/financial/goals/${id}`),
}

export default apiService
