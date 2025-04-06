// frontend/src/utils/api-helper.ts
import { createClient } from '@/lib/supabase-browser'

// API base URL from environment variable
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// Interface for API request options
interface ApiRequestOptions {
  requiresAuth?: boolean
  headers?: Record<string, string>
  errorMessage?: string
}

// Interface for API response
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    status: number
    message: string
  }
}

/**
 * Function to make API requests with proper error handling
 * and automatic currency header injection
 */
export async function apiRequest<T>(
  endpoint: string,
  method: string,
  data?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Add currency preference header from localStorage if available
    const currencyPreference = localStorage.getItem('currency')
    if (currencyPreference) {
      headers['X-Currency-Preference'] = currencyPreference
    }

    // Add authorization header if required
    if (options.requiresAuth) {
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getSession()

      if (authData.session?.access_token) {
        headers['Authorization'] = `Bearer ${authData.session.access_token}`
      } else {
        throw new Error('No authentication token available')
      }
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data)
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

    // Try to parse JSON response
    const responseData = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        success: false,
        error: {
          status: response.status,
          message:
            responseData?.error || options.errorMessage || 'An error occurred',
        },
      }
    }

    return {
      success: true,
      data: responseData,
    }
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error)

    return {
      success: false,
      error: {
        status: 500,
        message: options.errorMessage || error.message || 'An error occurred',
      },
    }
  }
}

// Convenience methods for common HTTP verbs
export async function get<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, 'GET', undefined, options)
}

export async function post<T>(
  endpoint: string,
  data: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, 'POST', data, options)
}

export async function put<T>(
  endpoint: string,
  data: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, 'PUT', data, options)
}

export async function del<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, 'DELETE', undefined, options)
}
