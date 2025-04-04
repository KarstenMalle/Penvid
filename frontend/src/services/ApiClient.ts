// frontend/src/services/ApiClient.ts - Improved with caching and better error handling

import { createClient } from '@/lib/supabase-browser'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// Types
export interface ApiError {
  status: number
  message: string
  details?: any
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  status: 'success' | 'error'
}

// Cache configuration
interface CacheConfig {
  enabled: boolean
  ttl: number // Time to live in milliseconds
}

const defaultCacheConfig: CacheConfig = {
  enabled: true,
  ttl: 1000 * 60 * 5, // 5 minutes
}

// Cache storage
interface CacheItem<T> {
  data: T
  expiry: number
}

const cache: Record<string, CacheItem<any>> = {}

// Request cancellation store
type CancelFunctions = Record<string, AbortController>
const pendingRequests: CancelFunctions = {}

/**
 * Enhanced API client with caching, error handling, and request cancellation
 */
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

    return headers
  }

  private static getCacheKey(endpoint: string, params?: any): string {
    const queryString = params ? JSON.stringify(params) : ''
    return `${endpoint}:${queryString}`
  }

  private static getFromCache<T>(cacheKey: string): T | null {
    const item = cache[cacheKey]
    if (!item) return null

    // Check if cache has expired
    if (item.expiry < Date.now()) {
      delete cache[cacheKey]
      return null
    }

    return item.data
  }

  private static setCache<T>(cacheKey: string, data: T, ttl: number): void {
    cache[cacheKey] = {
      data,
      expiry: Date.now() + ttl,
    }
  }

  private static clearCache(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      Object.keys(cache).forEach((key) => delete cache[key])
    } else {
      // Clear cache matching pattern
      Object.keys(cache).forEach((key) => {
        if (key.includes(pattern)) {
          delete cache[key]
        }
      })
    }
  }

  /**
   * Perform a GET request
   */
  static async get<T>(
    endpoint: string,
    options: {
      requiresAuth?: boolean
      cache?: CacheConfig | false
      params?: Record<string, any>
      signal?: AbortSignal
      requestId?: string
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      requiresAuth = false,
      cache: cacheConfig = defaultCacheConfig,
      params,
      signal,
      requestId,
    } = options

    try {
      // Handle cancellation
      if (requestId) {
        // Cancel previous request with same ID if exists
        this.cancelRequest(requestId)

        // Create new abort controller
        const controller = new AbortController()
        pendingRequests[requestId] = controller

        // Use the new abort signal or the one passed in
        const requestSignal = signal || controller.signal

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

        // Check cache if enabled
        if (cacheConfig && cacheConfig.enabled) {
          const cacheKey = this.getCacheKey(endpoint, params)
          const cachedData = this.getFromCache<T>(cacheKey)
          if (cachedData) {
            return { data: cachedData, status: 'success' }
          }
        }

        const headers = await this.getHeaders(requiresAuth)
        const response = await fetch(url, {
          headers,
          signal: requestSignal,
        })

        // Clean up request from pending list
        if (requestId) {
          delete pendingRequests[requestId]
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw {
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData,
          }
        }

        const data = await response.json()

        // Cache the result if enabled
        if (cacheConfig && cacheConfig.enabled) {
          const cacheKey = this.getCacheKey(endpoint, params)
          this.setCache(cacheKey, data, cacheConfig.ttl)
        }

        return {
          data,
          status: 'success',
        }
      } else {
        // Simple request without cancellation
        const headers = await this.getHeaders(requiresAuth)

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

        // Check cache if enabled
        if (cacheConfig && cacheConfig.enabled) {
          const cacheKey = this.getCacheKey(endpoint, params)
          const cachedData = this.getFromCache<T>(cacheKey)
          if (cachedData) {
            return { data: cachedData, status: 'success' }
          }
        }

        const response = await fetch(url, {
          headers,
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw {
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData,
          }
        }

        const data = await response.json()

        // Cache the result if enabled
        if (cacheConfig && cacheConfig.enabled) {
          const cacheKey = this.getCacheKey(endpoint, params)
          this.setCache(cacheKey, data, cacheConfig.ttl)
        }

        return {
          data,
          status: 'success',
        }
      }
    } catch (error: any) {
      // Handle AbortError separately
      if (error.name === 'AbortError') {
        return {
          error: {
            status: 499, // Client Closed Request
            message: 'Request cancelled',
          },
          status: 'error',
        }
      }

      // Handle other errors
      console.error(`GET request failed for ${endpoint}:`, error)
      return {
        error: {
          status: error.status || 500,
          message: error.message || 'Unknown error occurred',
          details: error.details,
        },
        status: 'error',
      }
    }
  }

  /**
   * Perform a POST request
   */
  static async post<T, U>(
    endpoint: string,
    data: T,
    options: {
      requiresAuth?: boolean
      invalidateCache?: string
      signal?: AbortSignal
      requestId?: string
    } = {}
  ): Promise<ApiResponse<U>> {
    const { requiresAuth = false, invalidateCache, signal, requestId } = options

    try {
      // Handle cancellation
      if (requestId) {
        // Cancel previous request with same ID if exists
        this.cancelRequest(requestId)

        // Create new abort controller
        const controller = new AbortController()
        pendingRequests[requestId] = controller

        // Use the new abort signal or the one passed in
        const requestSignal = signal || controller.signal

        const headers = await this.getHeaders(requiresAuth)
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
          signal: requestSignal,
        })

        // Clean up request from pending list
        if (requestId) {
          delete pendingRequests[requestId]
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw {
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData,
          }
        }

        const responseData = await response.json()

        // Invalidate cache if specified
        if (invalidateCache) {
          this.clearCache(invalidateCache)
        }

        return {
          data: responseData,
          status: 'success',
        }
      } else {
        // Simple request without cancellation
        const headers = await this.getHeaders(requiresAuth)
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw {
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData,
          }
        }

        const responseData = await response.json()

        // Invalidate cache if specified
        if (invalidateCache) {
          this.clearCache(invalidateCache)
        }

        return {
          data: responseData,
          status: 'success',
        }
      }
    } catch (error: any) {
      // Handle AbortError separately
      if (error.name === 'AbortError') {
        return {
          error: {
            status: 499, // Client Closed Request
            message: 'Request cancelled',
          },
          status: 'error',
        }
      }

      // Handle other errors
      console.error(`POST request failed for ${endpoint}:`, error)
      return {
        error: {
          status: error.status || 500,
          message: error.message || 'Unknown error occurred',
          details: error.details,
        },
        status: 'error',
      }
    }
  }

  /**
   * Perform a PUT request
   */
  static async put<T, U>(
    endpoint: string,
    data: T,
    options: {
      requiresAuth?: boolean
      invalidateCache?: string
      signal?: AbortSignal
      requestId?: string
    } = {}
  ): Promise<ApiResponse<U>> {
    const { requiresAuth = false, invalidateCache, signal, requestId } = options

    try {
      // Handle cancellation similar to POST
      if (requestId) {
        this.cancelRequest(requestId)
        const controller = new AbortController()
        pendingRequests[requestId] = controller
        const requestSignal = signal || controller.signal

        const headers = await this.getHeaders(requiresAuth)
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
          signal: requestSignal,
        })

        if (requestId) {
          delete pendingRequests[requestId]
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw {
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData,
          }
        }

        const responseData = await response.json()

        if (invalidateCache) {
          this.clearCache(invalidateCache)
        }

        return {
          data: responseData,
          status: 'success',
        }
      } else {
        const headers = await this.getHeaders(requiresAuth)
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw {
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData,
          }
        }

        const responseData = await response.json()

        if (invalidateCache) {
          this.clearCache(invalidateCache)
        }

        return {
          data: responseData,
          status: 'success',
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          error: {
            status: 499,
            message: 'Request cancelled',
          },
          status: 'error',
        }
      }

      console.error(`PUT request failed for ${endpoint}:`, error)
      return {
        error: {
          status: error.status || 500,
          message: error.message || 'Unknown error occurred',
          details: error.details,
        },
        status: 'error',
      }
    }
  }

  /**
   * Perform a DELETE request
   */
  static async delete<T>(
    endpoint: string,
    options: {
      requiresAuth?: boolean
      invalidateCache?: string
      signal?: AbortSignal
      requestId?: string
    } = {}
  ): Promise<ApiResponse<T>> {
    const { requiresAuth = false, invalidateCache, signal, requestId } = options

    try {
      // Handle cancellation similar to other methods
      if (requestId) {
        this.cancelRequest(requestId)
        const controller = new AbortController()
        pendingRequests[requestId] = controller
        const requestSignal = signal || controller.signal

        const headers = await this.getHeaders(requiresAuth)
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'DELETE',
          headers,
          signal: requestSignal,
        })

        if (requestId) {
          delete pendingRequests[requestId]
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw {
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData,
          }
        }

        const responseData = await response.json()

        if (invalidateCache) {
          this.clearCache(invalidateCache)
        }

        return {
          data: responseData,
          status: 'success',
        }
      } else {
        const headers = await this.getHeaders(requiresAuth)
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'DELETE',
          headers,
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw {
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData,
          }
        }

        const responseData = await response.json()

        if (invalidateCache) {
          this.clearCache(invalidateCache)
        }

        return {
          data: responseData,
          status: 'success',
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          error: {
            status: 499,
            message: 'Request cancelled',
          },
          status: 'error',
        }
      }

      console.error(`DELETE request failed for ${endpoint}:`, error)
      return {
        error: {
          status: error.status || 500,
          message: error.message || 'Unknown error occurred',
          details: error.details,
        },
        status: 'error',
      }
    }
  }

  /**
   * Cancel a pending request by ID
   */
  static cancelRequest(requestId: string): void {
    const controller = pendingRequests[requestId]
    if (controller) {
      controller.abort()
      delete pendingRequests[requestId]
    }
  }

  /**
   * Cancel all pending requests
   */
  static cancelAllRequests(): void {
    Object.values(pendingRequests).forEach((controller) => {
      controller.abort()
    })
    Object.keys(pendingRequests).forEach((key) => {
      delete pendingRequests[key]
    })
  }

  /**
   * Invalidate specific cache entries
   */
  static invalidateCache(pattern: string): void {
    this.clearCache(pattern)
  }

  /**
   * Clear all API cache
   */
  static clearAllCache(): void {
    this.clearCache()
  }
}
