// frontend/src/services/ApiClient.ts

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface ApiError {
  status: number
  message: string
}

export class ApiClient {
  private static async getHeaders(
    requiresAuth: boolean = false
  ): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (requiresAuth) {
      // Add auth headers when implemented
      // headers['Authorization'] = `Bearer ${token}`;
    }

    return headers
  }

  static async get<T>(
    endpoint: string,
    requiresAuth: boolean = false
  ): Promise<T> {
    try {
      const headers = await this.getHeaders(requiresAuth)
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers })

      if (!response.ok) {
        throw {
          status: response.status,
          message: response.statusText,
        }
      }

      return await response.json()
    } catch (error) {
      console.error(`GET request failed for ${endpoint}:`, error)
      throw error
    }
  }

  static async post<T, U>(
    endpoint: string,
    data: T,
    requiresAuth: boolean = false
  ): Promise<U> {
    try {
      const headers = await this.getHeaders(requiresAuth)
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw {
          status: response.status,
          message: response.statusText,
        }
      }

      return await response.json()
    } catch (error) {
      console.error(`POST request failed for ${endpoint}:`, error)
      throw error
    }
  }
}
