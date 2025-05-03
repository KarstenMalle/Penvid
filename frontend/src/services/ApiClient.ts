// frontend/src/services/ApiClient.ts

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { createClient } from '@/lib/supabase-browser'
import toast from 'react-hot-toast'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT = 30000 // 30 seconds

/**
 * Standardized API response
 */
export interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  error?: {
    status: number
    message: string
    details?: any
  }
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

// Token request tracking to prevent multiple simultaneous token fetches
let tokenRequestInProgress: Promise<string | null> | null = null
const tokenExpiryTime = 60 * 60 * 1000 // 1 hour in milliseconds
let tokenCache: { token: string | null; expiry: number } | null = null

/**
 * Enhanced API client with caching, error handling, request cancellation, and improved token handling
 */
export class ApiClient {
  /**
   * Get an auth token from Supabase with better error handling and caching
   */
  private static async getAuthToken(): Promise<string | null> {
    // Check cache first
    const now = Date.now()
    if (tokenCache && tokenCache.expiry > now && tokenCache.token) {
      return tokenCache.token
    }

    // If a token request is already in progress, return that promise
    if (tokenRequestInProgress) {
      return tokenRequestInProgress
    }

    // Create a new promise for the token fetch
    tokenRequestInProgress = (async () => {
      try {
        console.log('Fetching new auth token from Supabase')
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting auth token:', error)
          return null
        }

        if (!data.session) {
          console.log('No active session found')
          return null
        }

        const token = data.session.access_token

        // Cache the token with expiry
        tokenCache = {
          token,
          expiry: now + tokenExpiryTime,
        }

        return token
      } catch (error) {
        console.error('Error getting auth token:', error)
        return null
      } finally {
        // Clear the in-progress request after a short delay
        setTimeout(() => {
          tokenRequestInProgress = null
        }, 100)
      }
    })()

    return tokenRequestInProgress
  }

  /**
   * Clear the token cache
   */
  public static clearTokenCache() {
    tokenCache = null
    tokenRequestInProgress = null
    console.log('Token cache cleared')
  }

  /**
   * Get standard headers including authentication if required
   */
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
      } else {
        // Log the issue for debugging
        console.warn('Authentication token required but not available')
      }
    }

    return headers
  }

  /**
   * Generate a cache key for a given endpoint and params
   */
  private static getCacheKey(endpoint: string, params?: any): string {
    const queryString = params ? JSON.stringify(params) : ''
    return `${endpoint}:${queryString}`
  }

  /**
   * Retrieve data from cache if valid
   */
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

  /**
   * Store data in cache
   */
  private static setCache<T>(cacheKey: string, data: T, ttl: number): void {
    cache[cacheKey] = {
      data,
      expiry: Date.now() + ttl,
    }
  }

  /**
   * Clear cache items matching a pattern or all cache if no pattern provided
   */
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
      retries?: number
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      requiresAuth = true,
      cache: cacheConfig = defaultCacheConfig,
      params,
      signal,
      requestId,
      retries = 1,
    } = options

    try {
      // Check if auth is required but no token available
      if (requiresAuth) {
        const token = await this.getAuthToken()
        if (!token) {
          return {
            error: {
              status: 401,
              message: 'Authentication required',
              details: { reason: 'No authentication token available' },
            },
            status: 'error',
          }
        }
      }

      // Handle cancellation
      let localController: AbortController | undefined
      let requestSignal = signal

      if (requestId) {
        // Cancel previous request with same ID if exists
        this.cancelRequest(requestId)

        // Create new abort controller
        localController = new AbortController()
        pendingRequests[requestId] = localController

        // Use the new abort signal or the one passed in
        requestSignal = signal || localController.signal
      }

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
        // If unauthorized and retries left, wait and retry
        if (response.status === 401 && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          return this.get<T>(endpoint, { ...options, retries: retries - 1 })
        }

        const errorData = await response.json().catch(() => ({}))
        throw {
          status: response.status,
          message: errorData.message || errorData.detail || response.statusText,
          details: errorData,
        }
      }

      const data = await response.json()
      // Handle standardized API responses with status/data/message pattern
      const responseData = data.data !== undefined ? data.data : data

      // Cache the result if enabled
      if (cacheConfig && cacheConfig.enabled) {
        const cacheKey = this.getCacheKey(endpoint, params)
        this.setCache(cacheKey, responseData, cacheConfig.ttl)
      }

      return {
        data: responseData,
        status: 'success',
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
  static async post<T = any, U = any>(
    endpoint: string,
    data: T,
    options: {
      requiresAuth?: boolean
      invalidateCache?: string
      signal?: AbortSignal
      requestId?: string
      retries?: number
    } = {}
  ): Promise<ApiResponse<U>> {
    const {
      requiresAuth = true,
      invalidateCache,
      signal,
      requestId,
      retries = 1,
    } = options

    try {
      // Check if auth is required but no token available
      if (requiresAuth) {
        const token = await this.getAuthToken()
        if (!token) {
          return {
            error: {
              status: 401,
              message: 'Authentication required',
              details: { reason: 'No authentication token available' },
            },
            status: 'error',
          }
        }
      }

      // Handle cancellation
      let localController: AbortController | undefined
      let requestSignal = signal

      if (requestId) {
        // Cancel previous request with same ID if exists
        this.cancelRequest(requestId)

        // Create new abort controller
        localController = new AbortController()
        pendingRequests[requestId] = localController

        // Use the new abort signal or the one passed in
        requestSignal = signal || localController.signal
      }

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
        // If unauthorized and retries left, wait and retry
        if (response.status === 401 && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          return this.post<T, U>(endpoint, data, {
            ...options,
            retries: retries - 1,
          })
        }

        const errorData = await response.json().catch(() => ({}))
        throw {
          status: response.status,
          message: errorData.message || errorData.detail || response.statusText,
          details: errorData,
        }
      }

      const responseData = await response.json()
      // Handle standardized API responses with status/data/message pattern
      const result =
        responseData.data !== undefined ? responseData.data : responseData

      // Invalidate cache if specified
      if (invalidateCache) {
        this.clearCache(invalidateCache)
      }

      return {
        data: result,
        status: 'success',
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
  static async put<T = any, U = any>(
    endpoint: string,
    data: T,
    options: {
      requiresAuth?: boolean
      invalidateCache?: string
      signal?: AbortSignal
      requestId?: string
      retries?: number
    } = {}
  ): Promise<ApiResponse<U>> {
    const {
      requiresAuth = true,
      invalidateCache,
      signal,
      requestId,
      retries = 1,
    } = options

    try {
      // Check if auth is required but no token available
      if (requiresAuth) {
        const token = await this.getAuthToken()
        if (!token) {
          return {
            error: {
              status: 401,
              message: 'Authentication required',
              details: { reason: 'No authentication token available' },
            },
            status: 'error',
          }
        }
      }

      // Handle cancellation
      let localController: AbortController | undefined
      let requestSignal = signal

      if (requestId) {
        this.cancelRequest(requestId)
        localController = new AbortController()
        pendingRequests[requestId] = localController
        requestSignal = signal || localController.signal
      }

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
        // If unauthorized and retries left, wait and retry
        if (response.status === 401 && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          return this.put<T, U>(endpoint, data, {
            ...options,
            retries: retries - 1,
          })
        }

        const errorData = await response.json().catch(() => ({}))
        throw {
          status: response.status,
          message: errorData.message || errorData.detail || response.statusText,
          details: errorData,
        }
      }

      const responseData = await response.json()
      // Handle standardized API responses with status/data/message pattern
      const result =
        responseData.data !== undefined ? responseData.data : responseData

      if (invalidateCache) {
        this.clearCache(invalidateCache)
      }

      return {
        data: result,
        status: 'success',
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
      retries?: number
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      requiresAuth = true,
      invalidateCache,
      signal,
      requestId,
      retries = 1,
    } = options

    try {
      // Check if auth is required but no token available
      if (requiresAuth) {
        const token = await this.getAuthToken()
        if (!token) {
          return {
            error: {
              status: 401,
              message: 'Authentication required',
              details: { reason: 'No authentication token available' },
            },
            status: 'error',
          }
        }
      }

      // Handle cancellation
      let localController: AbortController | undefined
      let requestSignal = signal

      if (requestId) {
        this.cancelRequest(requestId)
        localController = new AbortController()
        pendingRequests[requestId] = localController
        requestSignal = signal || localController.signal
      }

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
        // If unauthorized and retries left, wait and retry
        if (response.status === 401 && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          return this.delete<T>(endpoint, { ...options, retries: retries - 1 })
        }

        const errorData = await response.json().catch(() => ({}))
        throw {
          status: response.status,
          message: errorData.message || errorData.detail || response.statusText,
          details: errorData,
        }
      }

      const responseData = await response.json()
      // Handle standardized API responses with status/data/message pattern
      const result =
        responseData.data !== undefined ? responseData.data : responseData

      if (invalidateCache) {
        this.clearCache(invalidateCache)
      }

      return {
        data: result,
        status: 'success',
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
