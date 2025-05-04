// frontend/src/utils/api-helper.ts

import { createClient } from '@/lib/supabase-browser'

export async function getAuthToken(): Promise<string> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  } catch (error) {
    console.error('Error getting auth token:', error)
    return ''
  }
}

export async function get(url: string, requiresAuth = false): Promise<any> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (requiresAuth) {
      const token = await getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API GET error:', error)
    throw error
  }
}

export async function post(
  url: string,
  data: any,
  requiresAuth = false
): Promise<any> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (requiresAuth) {
      const token = await getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API POST error:', error)
    throw error
  }
}

export async function put(
  url: string,
  data: any,
  requiresAuth = false
): Promise<any> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (requiresAuth) {
      const token = await getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API PUT error:', error)
    throw error
  }
}

export async function del(url: string, requiresAuth = false): Promise<any> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (requiresAuth) {
      const token = await getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API DELETE error:', error)
    throw error
  }
}
