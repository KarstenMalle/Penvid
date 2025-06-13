// File: frontend/src/utils/api-helper.ts

// API request timeout (in milliseconds)
const API_TIMEOUT = 10000 // Increase from 5000 to 10000

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

/**
 * Helper function to make GET requests to the API
 */
export async function get<T>(
  endpoint: string,
  options?: {
    requiresAuth?: boolean
    timeout?: number
  }
): Promise<T> {
  const { requiresAuth = false, timeout = API_TIMEOUT } = options || {}

  // Setup timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add authorization if needed
    if (requiresAuth) {
      const token = await getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    // Make request
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    // Clear timeout
    clearTimeout(timeoutId)

    // Handle response
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // Clear timeout to prevent memory leaks
    clearTimeout(timeoutId)

    // Re-throw error
    throw error
  }
}

/**
 * Helper function to make POST requests to the API
 */
export async function post<T>(
  endpoint: string,
  data: any,
  options?: {
    requiresAuth?: boolean
    timeout?: number
  }
): Promise<T> {
  const { requiresAuth = false, timeout = API_TIMEOUT } = options || {}

  // Setup timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add authorization if needed
    if (requiresAuth) {
      const token = await getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    // Make request
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: controller.signal,
    })

    // Clear timeout
    clearTimeout(timeoutId)

    // Handle response
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // Clear timeout to prevent memory leaks
    clearTimeout(timeoutId)

    // Re-throw error
    throw error
  }
}

/**
 * Helper function to get authentication token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // Import createClient from supabase-browser
    const { createClient } = await import('@/lib/supabase-browser')
    const supabase = createClient()

    // Get session
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}
