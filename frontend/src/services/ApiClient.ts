// frontend/src/services/ApiClient.ts
import { createClient } from '@/lib/supabase-browser'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// Types for standardized API response
export interface ApiError {
  status: number
  message: string
  details?: any
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  error?: string | ApiError
  message?: string
  metadata?: any
}

export class ApiClient {
  private static async getAuthToken(): Promise<string | null> {
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token || null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  private static async getHeaders(
    requiresAuth: boolean = false
  ): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (requiresAuth) {
      const token = await this.getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    // Add currency preference header if available in localStorage
    const currencyPreference = localStorage.getItem('currency')
    if (currencyPreference) {
      headers['X-Currency-Preference'] = currencyPreference
    }

    return headers
  }

  private static async processResponse<T>(
    response: Response
  ): Promise<ApiResponse<T>> {
    try {
      // First get the raw text to avoid parsing errors
      const text = await response.text();
      console.log(`Raw response text: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
      
      let data;
      try {
        // Try to parse the text as JSON
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        return {
          status: 'error',
          error: {
            status: response.status,
            message: `Failed to parse response as JSON: ${text.substring(0, 100)}...`,
          },
        };
      }

      // Check for error responses
      if (!response.ok) {
        console.error('API error response:', data);
        
        if (data.detail) {
          // FastAPI error format
          return {
            status: 'error',
            error: data.detail,
          }
        } else if (data.error) {
          // Our custom error format
          return {
            status: 'error',
            error: data.error,
          }
        } else {
          // Generic error
          return {
            status: 'error',
            error: {
              status: response.status,
              message: response.statusText || 'Unknown error',
            },
          }
        }
      }

      // Handle backend standardized response format
      console.log('Parsed API response:', data);
      
      return {
        status: data.status || 'success',
        data: data.data,
        error: data.error,
        message: data.message,
        metadata: data.metadata,
      }
    } catch (error) {
      console.error('Error processing API response:', error)
      return {
        status: 'error',
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Failed to process response',
        },
      }
    }
  }

  static async get<T>(
    endpoint: string,
    options: {
      requiresAuth?: boolean
      params?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T>> {
    const { requiresAuth = false, params } = options

    try {
      // Build URL with query parameters
      let url = `${API_BASE_URL}${endpoint}`
      if (params) {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value))
          }
        })
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`
        }
      }

      // Get headers with auth token if needed
      const headers = await this.getHeaders(requiresAuth)

      // Make the request
      const response = await fetch(url, { headers })

      // Process the response
      return await this.processResponse<T>(response)
    } catch (error: any) {
      console.error(`GET request failed for ${endpoint}:`, error)
      return {
        status: 'error',
        error: {
          status: 500,
          message: error.message || 'Unknown error occurred',
        },
      }
    }
  }

  static async post<T>(
    endpoint: string,
    data: any,
    options: {
      requiresAuth?: boolean
    } = {}
  ): Promise<ApiResponse<T>> {
    const { requiresAuth = false } = options

    try {
      console.log(`POST request to ${endpoint}`, { data })
      // Get headers with auth token if needed
      const headers = await this.getHeaders(requiresAuth)
      console.log(`Headers for ${endpoint}:`, headers)

      // Make the request
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })

      console.log(`Response status for ${endpoint}:`, response.status)
      // Process the response
      return await this.processResponse<T>(response)
    } catch (error: any) {
      console.error(`POST request failed for ${endpoint}:`, error)
      return {
        status: 'error',
        error: {
          status: 500,
          message: error.message || 'Unknown error occurred',
        },
      }
    }
  }

  static async put<T>(
    endpoint: string,
    data: any,
    options: {
      requiresAuth?: boolean
    } = {}
  ): Promise<ApiResponse<T>> {
    const { requiresAuth = false } = options

    try {
      // Get headers with auth token if needed
      const headers = await this.getHeaders(requiresAuth)

      // Make the request
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      })

      // Process the response
      return await this.processResponse<T>(response)
    } catch (error: any) {
      console.error(`PUT request failed for ${endpoint}:`, error)
      return {
        status: 'error',
        error: {
          status: 500,
          message: error.message || 'Unknown error occurred',
        },
      }
    }
  }

  static async delete<T>(
    endpoint: string,
    options: {
      requiresAuth?: boolean
    } = {}
  ): Promise<ApiResponse<T>> {
    const { requiresAuth = false } = options

    try {
      // Get headers with auth token if needed
      const headers = await this.getHeaders(requiresAuth)

      // Make the request
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
      })

      // Process the response
      return await this.processResponse<T>(response)
    } catch (error: any) {
      console.error(`DELETE request failed for ${endpoint}:`, error)
      return {
        status: 'error',
        error: {
          status: 500,
          message: error.message || 'Unknown error occurred',
        },
      }
    }
  }
}