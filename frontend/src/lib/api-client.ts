import axios, { AxiosError, AxiosResponse } from 'axios'

// Define interface for profile data
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

// Define interface for profile update data
export interface ProfileUpdate {
  name?: string | null
  avatar_url?: string | null
  language_preference?: string | null
  currency_preference?: string
  country_preference?: string | null
}

// Create a base API instance
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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

// API service functions
export const apiService = {
  // Profile endpoints
  getProfile: () => apiRequest<Profile>('GET', '/api/profile'),
  updateProfile: (data: ProfileUpdate) =>
    apiRequest<Profile>('PATCH', '/api/profile', data),

  // Currency endpoints
  getSupportedCurrencies: () => apiRequest<string[]>('GET', '/api/currencies'),
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string) =>
    apiRequest('POST', '/api/currencies/convert', {
      amount,
      fromCurrency,
      toCurrency,
    }),

  // Financial endpoints
  getAccounts: () => apiRequest('GET', '/api/financial/accounts'),
  getTransactions: () => apiRequest('GET', '/api/financial/transactions'),
  getLoans: () => apiRequest('GET', '/api/financial/loans'),
  getInvestments: () => apiRequest('GET', '/api/financial/investments'),
  getGoals: () => apiRequest('GET', '/api/financial/goals'),
}

export default apiService
