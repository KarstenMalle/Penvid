// frontend/src/services/api/index.ts
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { getAuthToken } from './auth'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

/**
 * Standardized API response
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  status: number
}

/**
 * Core API client for all backend communication
 */
export const apiClient = {
  /**
   * Make a GET request to the API
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    requiresAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const token = requiresAuth ? await getAuthToken() : null
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        params,
        headers,
      })

      return {
        success: true,
        data: response.data,
        status: response.status,
      }
    } catch (error) {
      // Format error for consistent handling
      return formatError(error)
    }
  },

  /**
   * Make a POST request to the API
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    requiresAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const token = requiresAuth ? await getAuthToken() : null
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, data, {
        headers,
      })

      return {
        success: true,
        data: response.data,
        status: response.status,
      }
    } catch (error) {
      return formatError(error)
    }
  },

  /**
   * Make a PUT request to the API
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    requiresAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const token = requiresAuth ? await getAuthToken() : null
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await axios.put(`${API_BASE_URL}${endpoint}`, data, {
        headers,
      })

      return {
        success: true,
        data: response.data,
        status: response.status,
      }
    } catch (error) {
      return formatError(error)
    }
  },

  /**
   * Make a DELETE request to the API
   */
  async delete<T = any>(
    endpoint: string,
    requiresAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const token = requiresAuth ? await getAuthToken() : null
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await axios.delete(`${API_BASE_URL}${endpoint}`, {
        headers,
      })

      return {
        success: true,
        data: response.data,
        status: response.status,
      }
    } catch (error) {
      return formatError(error)
    }
  },
}

/**
 * Format API errors into a consistent structure
 */
function formatError(error: any): ApiResponse {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError
    const status = axiosError.response?.status || 500
    const data = axiosError.response?.data as any

    let message = 'An error occurred'
    if (data?.error?.message) {
      message = data.error.message
    } else if (data?.message) {
      message = data.message
    } else if (data?.detail) {
      message = data.detail
    } else if (axiosError.message) {
      message = axiosError.message
    }

    return {
      success: false,
      error: {
        message,
        code: status.toString(),
        details: data,
      },
      status,
    }
  }

  return {
    success: false,
    error: {
      message: error?.message || 'Unknown error occurred',
    },
    status: 500,
  }
}

/**
 * Helper function to retrieve auth token
 */
export async function getAuthToken(): Promise<string | null> {
  // Implementation from auth.ts
  return null
}
