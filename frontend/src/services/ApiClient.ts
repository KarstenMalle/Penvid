// frontend/src/services/ApiClient.ts

import { createClient } from '@/lib/supabase-browser'
import toast from 'react-hot-toast'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT = 30000 // 30 seconds

/**
 * Standardized API response
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    status?: number
    details?: any
  }
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
const pendingRequests: Record<string, AbortController> = {}

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
 * Enhanced API client with caching, error handling and request cancellation
 */
export const ApiClient = {
  /**
   * Get a cached value by key, or null if not found/expired
   */
  getCachedValue<T>(key: string): T | null {
    const cachedItem = cache[key]
    if (!cachedItem) return null

    // Check if expired
    if (cachedItem.expiry < Date.now()) {
      delete cache[key]
      return null
    }

    return cachedItem.data
  },

  /**
   * Set a value in the cache
   */
  setCacheValue<T>(key: string, value: T, ttl: number): void {
    cache[key] = {
      data: value,
      expiry: Date.now() + ttl,
    }
  },

  /**
   * Generate a cache key from a request
   */
  getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}:${params ? JSON.stringify(params) : ''}`
  },

  /**
   * Clear all cache or cache matching a pattern
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      Object.keys(cache).forEach((key) => delete cache[key])
    } else {
      // Clear matching cache
      Object.keys(cache).forEach((key) => {
        if (key.includes(pattern)) {
          delete cache[key]
        }
      })
    }
  },

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    this.clearCache()
  },

  /**
   * Make a GET request to the API
   */
  async get<T = any>(
    endpoint: string,
    options: {
      params?: Record<string, any>
      requiresAuth?: boolean
      cache?: CacheConfig | false
      requestId?: string
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      params,
      requiresAuth = true,
      cache: cacheConfig = defaultCacheConfig,
      requestId,
    } = options

    try {
      // Cancel previous request with same ID if it exists
      if (requestId && pendingRequests[requestId]) {
        pendingRequests[requestId].abort()
        delete pendingRequests[requestId]
      }

      // Create abort controller for this request
      const controller = new AbortController()
      if (requestId) {
        pendingRequests[requestId] = controller
      }

      // Check cache first if enabled
      if (cacheConfig && cacheConfig.enabled) {
        const cacheKey = this.getCacheKey(endpoint, params)
        const cachedData = this.getCachedValue<T>(cacheKey)
        if (cachedData) {
          return { success: true, data: cachedData }
        }
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add authorization if required
      if (requiresAuth) {
        const token = await getAuthToken()
        if (!token) {
          console.warn('Auth token required but not available for', endpoint)
          return {
            success: false,
            error: {
              message: 'Authentication required',
              status: 401,
            },
          }
        }
        headers['Authorization'] = `Bearer ${token}`
      }

      // Build URL with query params
      let url = `${API_BASE_URL}${endpoint}`
      if (params) {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value))
          }
        })
        const queryString = queryParams.toString()
        if (queryString) {
          url += `?${queryString}`
        }
      }

      // Make the request
      console.log(`Making GET request to ${url}`)
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      // Clean up request from pending
      if (requestId) {
        delete pendingRequests[requestId]
      }

      // Handle non-ok response
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: errorText }
        }

        return {
          success: false,
          error: {
            message:
              errorData.message || errorData.error || response.statusText,
            status: response.status,
            details: errorData,
          },
        }
      }

      // Parse response
      const data = await response.json()

      // Handle standardized API responses with status/data/message pattern
      let resultData: T
      if (data && typeof data === 'object' && 'data' in data) {
        resultData = data.data
      } else {
        resultData = data as T
      }

      // Cache the response if enabled
      if (cacheConfig && cacheConfig.enabled) {
        const cacheKey = this.getCacheKey(endpoint, params)
        this.setCacheValue(cacheKey, resultData, cacheConfig.ttl)
      }

      return { success: true, data: resultData }
    } catch (error: any) {
      // Handle abort errors differently
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: {
            message: 'Request was cancelled',
            status: 499,
          },
        }
      }

      console.error(`Error in GET ${endpoint}:`, error)
      return {
        success: false,
        error: {
          message: error.message || 'Unknown error occurred',
          details: error,
        },
      }
    }
  },

  /**
   * Make a POST request to the API
   */
  async post<T = any, U = any>(
    endpoint: string,
    data: T,
    options: {
      requiresAuth?: boolean
      invalidateCache?: string
      requestId?: string
    } = {}
  ): Promise<ApiResponse<U>> {
    const { requiresAuth = true, invalidateCache, requestId } = options

    try {
      // Cancel previous request with same ID if it exists
      if (requestId && pendingRequests[requestId]) {
        pendingRequests[requestId].abort()
        delete pendingRequests[requestId]
      }

      // Create abort controller for this request
      const controller = new AbortController()
      if (requestId) {
        pendingRequests[requestId] = controller
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add authorization if required
      if (requiresAuth) {
        const token = await getAuthToken()
        if (!token) {
          console.warn('Auth token required but not available for', endpoint)
          return {
            success: false,
            error: {
              message: 'Authentication required',
              status: 401,
            },
          }
        }
        headers['Authorization'] = `Bearer ${token}`
      }

      // Make the request
      console.log(`Making POST request to ${API_BASE_URL}${endpoint}`)
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      })

      // Clean up request from pending
      if (requestId) {
        delete pendingRequests[requestId]
      }

      // Handle non-ok response
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: errorText }
        }

        return {
          success: false,
          error: {
            message:
              errorData.message || errorData.error || response.statusText,
            status: response.status,
            details: errorData,
          },
        }
      }

      // Parse response
      const responseData = await response.json()

      // Handle standardized API responses with status/data/message pattern
      let resultData: U
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData
      ) {
        resultData = responseData.data
      } else {
        resultData = responseData as U
      }

      // Invalidate cache if specified
      if (invalidateCache) {
        this.clearCache(invalidateCache)
      }

      return { success: true, data: resultData }
    } catch (error: any) {
      // Handle abort errors differently
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: {
            message: 'Request was cancelled',
            status: 499,
          },
        }
      }

      console.error(`Error in POST ${endpoint}:`, error)
      return {
        success: false,
        error: {
          message: error.message || 'Unknown error occurred',
          details: error,
        },
      }
    }
  },

  /**
   * Make a PUT request to the API
   */
  async put<T = any, U = any>(
    endpoint: string,
    data: T,
    options: {
      requiresAuth?: boolean
      invalidateCache?: string
      requestId?: string
    } = {}
  ): Promise<ApiResponse<U>> {
    const { requiresAuth = true, invalidateCache, requestId } = options

    try {
      // Cancel previous request with same ID if it exists
      if (requestId && pendingRequests[requestId]) {
        pendingRequests[requestId].abort()
        delete pendingRequests[requestId]
      }

      // Create abort controller for this request
      const controller = new AbortController()
      if (requestId) {
        pendingRequests[requestId] = controller
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add authorization if required
      if (requiresAuth) {
        const token = await getAuthToken()
        if (!token) {
          console.warn('Auth token required but not available for', endpoint)
          return {
            success: false,
            error: {
              message: 'Authentication required',
              status: 401,
            },
          }
        }
        headers['Authorization'] = `Bearer ${token}`
      }

      // Make the request
      console.log(`Making PUT request to ${API_BASE_URL}${endpoint}`)
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      })

      // Clean up request from pending
      if (requestId) {
        delete pendingRequests[requestId]
      }

      // Handle non-ok response
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: errorText }
        }

        return {
          success: false,
          error: {
            message:
              errorData.message || errorData.error || response.statusText,
            status: response.status,
            details: errorData,
          },
        }
      }

      // Parse response
      const responseData = await response.json()

      // Handle standardized API responses with status/data/message pattern
      let resultData: U
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData
      ) {
        resultData = responseData.data
      } else {
        resultData = responseData as U
      }

      // Invalidate cache if specified
      if (invalidateCache) {
        this.clearCache(invalidateCache)
      }

      return { success: true, data: resultData }
    } catch (error: any) {
      // Handle abort errors differently
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: {
            message: 'Request was cancelled',
            status: 499,
          },
        }
      }

      console.error(`Error in PUT ${endpoint}:`, error)
      return {
        success: false,
        error: {
          message: error.message || 'Unknown error occurred',
          details: error,
        },
      }
    }
  },

  /**
   * Make a DELETE request to the API
   */
  async delete<T = any>(
    endpoint: string,
    options: {
      requiresAuth?: boolean
      invalidateCache?: string
      requestId?: string
    } = {}
  ): Promise<ApiResponse<T>> {
    const { requiresAuth = true, invalidateCache, requestId } = options

    try {
      // Cancel previous request with same ID if it exists
      if (requestId && pendingRequests[requestId]) {
        pendingRequests[requestId].abort()
        delete pendingRequests[requestId]
      }

      // Create abort controller for this request
      const controller = new AbortController()
      if (requestId) {
        pendingRequests[requestId] = controller
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add authorization if required
      if (requiresAuth) {
        const token = await getAuthToken()
        if (!token) {
          console.warn('Auth token required but not available for', endpoint)
          return {
            success: false,
            error: {
              message: 'Authentication required',
              status: 401,
            },
          }
        }
        headers['Authorization'] = `Bearer ${token}`
      }

      // Make the request
      console.log(`Making DELETE request to ${API_BASE_URL}${endpoint}`)
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      })

      // Clean up request from pending
      if (requestId) {
        delete pendingRequests[requestId]
      }

      // Handle non-ok response
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: errorText }
        }

        return {
          success: false,
          error: {
            message:
              errorData.message || errorData.error || response.statusText,
            status: response.status,
            details: errorData,
          },
        }
      }

      // Parse response
      const responseData = await response.json()

      // Handle standardized API responses with status/data/message pattern
      let resultData: T
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData
      ) {
        resultData = responseData.data
      } else {
        resultData = responseData as T
      }

      // Invalidate cache if specified
      if (invalidateCache) {
        this.clearCache(invalidateCache)
      }

      return { success: true, data: resultData }
    } catch (error: any) {
      // Handle abort errors differently
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: {
            message: 'Request was cancelled',
            status: 499,
          },
        }
      }

      console.error(`Error in DELETE ${endpoint}:`, error)
      return {
        success: false,
        error: {
          message: error.message || 'Unknown error occurred',
          details: error,
        },
      }
    }
  },

  /**
   * Cancel a request by ID
   */
  cancelRequest(requestId: string): void {
    if (pendingRequests[requestId]) {
      pendingRequests[requestId].abort()
      delete pendingRequests[requestId]
    }
  },

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    Object.values(pendingRequests).forEach((controller) => {
      controller.abort()
    })
    Object.keys(pendingRequests).forEach((key) => {
      delete pendingRequests[key]
    })
  },
}
