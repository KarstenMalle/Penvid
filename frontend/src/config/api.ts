// API configuration
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
}

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    verify: '/api/auth/verify',
  },

  // Translations
  translations: {
    get: (locale: string) => `/api/translations/${locale}`,
    available: '/api/translations/available',
    single: (locale: string, key: string) =>
      `/api/translations/${locale}/${key}`,
  },

  // Preferences
  preferences: {
    get: '/api/preferences',
    update: '/api/preferences',
  },

  // Currency
  currency: {
    rates: '/api/currency/rates',
  },

  // Profile
  profile: {
    get: '/api/profile',
    update: '/api/profile',
  },

  // Loans
  loans: {
    list: (userId: string) => `/api/loans/${userId}`,
    save: (userId: string) => `/api/loans/${userId}`,
    update: (userId: string, loanId: number) =>
      `/api/loans/${userId}/${loanId}`,
    delete: (userId: string, loanId: number) =>
      `/api/loans/${userId}/${loanId}`,
  },
}
