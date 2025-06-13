import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'
import { API_CONFIG, API_ENDPOINTS } from '@/config/api'
import { createClient } from '@/lib/supabase-browser'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

class ApiClient {
  private client: AxiosInstance
  private authToken: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            // Try to refresh the session with Supabase
            const supabase = createClient()
            const {
              data: { session },
              error: refreshError,
            } = await supabase.auth.refreshSession()

            if (session?.access_token) {
              this.setAuthToken(session.access_token)
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${session.access_token}`
              }
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            // Redirect to login if refresh fails
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<any>(url, config)
      // Handle both standardized and non-standardized responses
      if (response.data && 'success' in response.data) {
        return response.data
      }
      // Convert non-standardized response
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<any>(url, data, config)
      // Handle both standardized and non-standardized responses
      if (response.data && 'success' in response.data) {
        return response.data
      }
      // Convert non-standardized response
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<any>(url, data, config)
      // Handle both standardized and non-standardized responses
      if (response.data && 'success' in response.data) {
        return response.data
      }
      // Convert non-standardized response
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<any>(url, config)
      // Handle both standardized and non-standardized responses
      if (response.data && 'success' in response.data) {
        return response.data
      }
      // Convert non-standardized response
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  private handleError(error: any): ApiResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>

      if (axiosError.response) {
        // Server responded with error
        const responseData = axiosError.response.data

        // Handle standardized error response
        if (responseData && 'success' in responseData) {
          return responseData
        }

        // Handle non-standardized error response
        return {
          success: false,
          error:
            responseData?.detail || responseData?.error || axiosError.message,
          message: responseData?.message || 'Request failed',
        }
      } else if (axiosError.request) {
        // Request made but no response
        return {
          success: false,
          error: 'Network error',
          message: 'Unable to reach the server. Please check your connection.',
        }
      }
    }

    // Something else happened
    return {
      success: false,
      error: 'Unknown error',
      message: error.message || 'An unexpected error occurred',
    }
  }
}

export const apiClient = new ApiClient()
