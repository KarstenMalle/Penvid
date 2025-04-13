import axios from 'axios'

// Create an axios instance for authentication endpoints
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const authApi = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types for authentication
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  message: string
  user: {
    id: string
    email: string
  }
  session?: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

// Authentication API functions
export const authService = {
  // Register a new user
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await authApi.post('/register', credentials)
    return response.data
  },

  // Login a user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await authApi.post('/login', credentials)
    return response.data
  },

  // Logout a user
  logout: async (): Promise<void> => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      await authApi.post(
        '/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
    }
    localStorage.removeItem('auth')
    localStorage.removeItem('auth_token')
  },

  // Request password reset
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await authApi.post('/forgot-password', { email })
    return response.data
  },

  // Reset password with token
  resetPassword: async (
    password: string,
    token: string
  ): Promise<{ message: string }> => {
    const response = await authApi.post(
      '/reset-password',
      { password },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  },
}

export default authService
