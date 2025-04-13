'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth-api'
import toast from 'react-hot-toast'

// Define interface for user
interface User {
  id: string
  email?: string
}

// Define types for the context and state
interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Initialize auth state on load
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Check if there's an auth token in local storage
        const authToken = localStorage.getItem('auth_token')
        const authFlag = localStorage.getItem('auth')

        if (authToken && authFlag === 'true') {
          // For simplicity, we'll just check if the token exists
          // In a real app, you might want to validate the token with the backend

          // Get the user ID from local storage or decode it from the JWT
          const userId = localStorage.getItem('user_id')
          const userEmail = localStorage.getItem('user_email')

          if (userId) {
            setUser({
              id: userId,
              email: userEmail || undefined,
            })
            setIsAuthenticated(true)

            // Debug log to confirm authentication state
            console.log('User authenticated from stored credentials')
          }
        } else {
          // Clear authentication state if no valid token
          setIsAuthenticated(false)
          setUser(null)
          console.log('No valid authentication token found')
        }
      } catch (error) {
        console.error('Error checking auth state:', error)
        // Clear any stale auth data
        localStorage.removeItem('auth')
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_id')
        localStorage.removeItem('user_email')
        setIsAuthenticated(false)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuthState()
  }, [])

  // Login method
  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)

      const response = await authService.login({ email, password })

      // Store auth info in localStorage
      localStorage.setItem('auth', 'true')
      localStorage.setItem('auth_token', response.session?.access_token || '')
      localStorage.setItem('user_id', response.user.id)
      localStorage.setItem('user_email', response.user.email)

      // Update state
      setUser({
        id: response.user.id,
        email: response.user.email,
      })
      setIsAuthenticated(true)

      console.log('Login successful, redirecting to dashboard...')
      toast.success('Login successful')

      // Use a timeout to ensure state has updated before navigation
      setTimeout(() => {
        router.push('/dashboard')

        // As a fallback, force page navigation if needed
        setTimeout(() => {
          if (window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard'
          }
        }, 300)
      }, 100)
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Failed to login')
      toast.error(error.message || 'Failed to login')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Logout method
  const logout = async () => {
    try {
      setLoading(true)
      await authService.logout()

      // Clear auth data
      localStorage.removeItem('auth')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_id')
      localStorage.removeItem('user_email')

      // Update state
      setUser(null)
      setIsAuthenticated(false)

      toast.success('Logged out successfully')
      router.push('/')
    } catch (error: any) {
      console.error('Logout error:', error)
      setError(error.message || 'Failed to logout')
      toast.error('Failed to logout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the Auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
