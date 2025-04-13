'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import apiService from '@/lib/api-client'

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
        // Check if there's an active session
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (data.session) {
          const { access_token, user } = data.session

          if (user) {
            localStorage.setItem('auth', 'true')
            localStorage.setItem('auth_token', access_token)

            setUser({
              id: user.id,
              email: user.email,
            })
            setIsAuthenticated(true)
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error)
        // Clear any stale auth data
        localStorage.removeItem('auth')
        localStorage.removeItem('auth_token')
      } finally {
        setLoading(false)
      }
    }

    checkAuthState()

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          localStorage.setItem('auth', 'true')
          localStorage.setItem('auth_token', session.access_token)

          setUser({
            id: session.user.id,
            email: session.user.email,
          })
          setIsAuthenticated(true)
        }

        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('auth')
          localStorage.removeItem('auth_token')
          setUser(null)
          setIsAuthenticated(false)
        }
      }
    )

    // Cleanup subscription
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  // Login method
  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data && data.user) {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Failed to login')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Logout method
  const logout = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      router.push('/')
    } catch (error: any) {
      console.error('Logout error:', error)
      setError(error.message || 'Failed to logout')
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
