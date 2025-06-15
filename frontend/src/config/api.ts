// File: frontend/src/config/api.ts

export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  timeout: 30000, // 30 seconds
}

export const API_ENDPOINTS = {
  // Health check - FIXED: Removed /api prefix since baseURL now includes /api
  health: '/health',

  // Authentication endpoints - FIXED: Removed /api prefix since baseURL now includes /api
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
    refresh: '/auth/refresh',
  },

  // User preferences endpoints - FIXED: Removed /api prefix since backend already includes it
  preferences: {
    get: '/preferences',
    update: '/preferences',
  },

  // Profile endpoints - FIXED: Corrected to /profile (singular) to match backend
  profiles: {
    get: '/profile',
    update: '/profile',
  },

  // Translation endpoints - FIXED: Removed /api prefix since backend already includes it
  translations: {
    available: '/translations/available',
    get: (locale: string) => `/translations/${locale}`,
  },

  // Currency endpoints - FIXED: Removed /api prefix since backend already includes it
  currency: {
    rates: '/currency/rates',
  },

  // Loan endpoints - FIXED: Removed /api prefix since baseURL now includes /api
  loans: {
    list: (userId: string) => `/loans/${userId}`,
    create: (userId: string) => `/loans/${userId}`,
    update: (userId: string, loanId: string) => `/loans/${userId}/${loanId}`,
    delete: (userId: string, loanId: string) => `/loans/${userId}/${loanId}`,
  },

  // Loan calculations - FIXED: Removed /api prefix since baseURL now includes /api
  calculations: {
    optimize: '/loan-calculations/optimize',
    compare: '/loan-calculations/compare',
  },
}
