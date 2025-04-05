// frontend/src/utils/api-helper.ts

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase-browser'

// Define API response structure
export interface ApiResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  status: number
  success: boolean
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT = 30000 // 30 seconds

/**
 * Get authentication token from Supabase
 */
export async function getAuthToken(): Promise<string | null> {
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
 * Creates a consistent API response format regardless of success or failure
 */
function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: Error | AxiosError,
  status?: number
): ApiResponse<T> {
  if (success && data) {
    return {
      data,
      success: true,
      status: status || 200,
    }
  }

  // Handle error
  let errorMessage = 'An unknown error occurred'
  let errorDetails = undefined
  let errorCode = undefined
  let errorStatus = status || 500

  if (error) {
    // Handle Axios-specific errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError

      // Connection errors
      if (!axiosError.response) {
        errorMessage = axiosError.message || 'Network or connection error'
        errorStatus = 0

        if (axiosError.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out'
          errorStatus = 408
        }
      }
      // Server errors (with response)
      else {
        errorStatus = axiosError.response.status

        // Try to parse error from response data
        const responseData = axiosError.response.data

        if (typeof responseData === 'object' && responseData !== null) {
          // Handle standard API error format
          if (responseData.error) {
            errorMessage =
              responseData.error.message ||
              responseData.message ||
              responseData.error
            errorDetails = responseData.error.details || responseData.details
            errorCode = responseData.error.code || responseData.code
          }
          // Handle FastAPI error format
          else if (responseData.detail) {
            errorMessage =
              typeof responseData.detail === 'string'
                ? responseData.detail
                : JSON.stringify(responseData.detail)
          }
          // Fallback to string representation of the object
          else {
            errorMessage = JSON.stringify(responseData)
          }
        }
        // Handle plain text error
        else if (typeof responseData === 'string') {
          errorMessage = responseData
        }
      }
    }
    // Handle regular JS Errors
    else {
      errorMessage = error.message || errorMessage
    }
  }

  return {
    error: {
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
    },
    success: false,
    status: errorStatus,
  }
}

/**
 * Enhanced fetch function with better error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    data?: any
    params?: Record<string, string | number | boolean | undefined>
    headers?: Record<string, string>
    timeout?: number
    withCredentials?: boolean
    token?: string
    requiresAuth?: boolean
    showErrorToast?: boolean
    errorMessage?: string
  } = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    data,
    params,
    headers = {},
    timeout = DEFAULT_TIMEOUT,
    withCredentials = true,
    token,
    requiresAuth = true, // Default to true since most endpoints require auth
    showErrorToast = true,
    errorMessage,
  } = options

  // Prepare full URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`

  // Set up headers including authorization if token provided
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // Get token either from options or from Supabase if requiresAuth is true
  let authToken = token
  if (requiresAuth && !authToken) {
    authToken = await getAuthToken()
  }

  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`
  } else if (requiresAuth) {
    console.warn(
      `No auth token available for authenticated request to ${endpoint}`
    )
  }

  // Configure axios request
  const config: AxiosRequestConfig = {
    method,
    url,
    headers: requestHeaders,
    timeout,
    withCredentials,
    params,
  }

  // Add data to request if it exists
  if (data) {
    config.data = data
  }

  try {
    const response: AxiosResponse<T> = await axios(config)
    return createApiResponse<T>(true, response.data, undefined, response.status)
  } catch (error: any) {
    // Create standardized error response
    const apiResponse = createApiResponse<T>(false, undefined, error)

    // Show error toast if enabled
    if (showErrorToast) {
      toast.error(
        errorMessage || apiResponse.error?.message || 'An error occurred'
      )
    }

    // Log detailed error for debugging
    console.error(`API Error (${method} ${endpoint}):`, {
      status: apiResponse.status,
      message: apiResponse.error?.message,
      details: apiResponse.error?.details,
      code: apiResponse.error?.code,
    })

    return apiResponse
  }
}

/**
 * Convenience method for GET requests
 */
export function get<T = any>(
  endpoint: string,
  options: Omit<Parameters<typeof apiRequest>[1], 'method'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' })
}

/**
 * Convenience method for POST requests
 */
export function post<T = any>(
  endpoint: string,
  data?: any,
  options: Omit<Parameters<typeof apiRequest>[1], 'method' | 'data'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'POST', data })
}

/**
 * Convenience method for PUT requests
 */
export function put<T = any>(
  endpoint: string,
  data?: any,
  options: Omit<Parameters<typeof apiRequest>[1], 'method' | 'data'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'PUT', data })
}

/**
 * Convenience method for DELETE requests
 */
export function del<T = any>(
  endpoint: string,
  options: Omit<Parameters<typeof apiRequest>[1], 'method'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
}

/**
 * Convenience method for PATCH requests
 */
export function patch<T = any>(
  endpoint: string,
  data?: any,
  options: Omit<Parameters<typeof apiRequest>[1], 'method' | 'data'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'PATCH', data })
}
