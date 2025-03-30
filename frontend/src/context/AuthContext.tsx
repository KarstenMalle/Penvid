'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-browser'
import { User } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

// Define types for the context and state
interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  profile: UserProfile | null
  login: (email: string, password: string) => Promise<{ error: Error | null }>
  logout: () => Promise<void>
  loading: boolean
  signUp: (
    email: string,
    password: string,
    metaData?: { name?: string }
  ) => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
}

interface UserProfile {
  id: string
  name?: string
  avatar_url?: string
  created_at?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Initial auth check & session setup
  useEffect(() => {
    // Main authentication function
    const setupAuth = async () => {
      try {
        console.log('Setting up authentication...')
        setLoading(true)

        // Get the current session
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error.message)
          return false
        }

        // If we have a session, set the user
        if (data.session) {
          console.log('Session found, setting authenticated user')
          setUser(data.session.user)
          setIsAuthenticated(true)

          // Simple profile based on user data
          const tempProfile = {
            id: data.session.user.id,
            name:
              data.session.user.user_metadata?.name ||
              data.session.user.email?.split('@')[0] ||
              'User',
            created_at: new Date().toISOString(),
          }

          setProfile(tempProfile)
          return true
        } else {
          console.log('No session found')
          return false
        }
      } catch (err) {
        console.error('Error in setupAuth:', err)
        return false
      } finally {
        // Always mark loading as complete
        setLoading(false)
      }
    }

    // Run the auth setup
    setupAuth()

    // Set up listener for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)

      if (session) {
        // User is authenticated
        setUser(session.user)
        setIsAuthenticated(true)

        // Set a basic profile using user metadata
        const tempProfile = {
          id: session.user.id,
          name:
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'User',
          created_at: new Date().toISOString(),
        }

        setProfile(tempProfile)
      } else {
        // User is not authenticated
        setUser(null)
        setIsAuthenticated(false)
        setProfile(null)
      }
    })

    // Clean up subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log('Logging in with email:', email)

      // Clear previous state
      setLoading(true)

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error.message)
        toast.error(error.message || 'Login failed')
        return { error }
      }

      // Login successful
      console.log('Login successful')
      toast.success('Login successful!')

      // Update auth state (this will now be handled by the onAuthStateChange listener)

      return { error: null }
    } catch (error: any) {
      console.error('Unexpected login error:', error)
      toast.error('An unexpected error occurred')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      console.log('Logging out...')

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Error during logout:', error)
        toast.error('Error logging out')
        return
      }

      // Reset state (this will be handled by onAuthStateChange, but we'll do it here too for immediacy)
      setUser(null)
      setIsAuthenticated(false)
      setProfile(null)

      toast.success('Logged out successfully')

      // Force a page reload to clear any state
      window.location.href = '/'
    } catch (error) {
      console.error('Error during logout:', error)
      toast.error('Error logging out')
    }
  }

  // Signup function
  const signUp = async (
    email: string,
    password: string,
    metaData?: { name?: string }
  ) => {
    try {
      console.log('Signing up with email:', email)

      // Try to sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metaData, // Store name in user metadata
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Signup error:', error.message)
        toast.error(error.message || 'Registration failed')
        return { error }
      }

      console.log('Signup successful')
      toast.success(
        'Registration successful! Please check your email to confirm your account.'
      )
      return { error: null }
    } catch (error: any) {
      console.error('Unexpected signup error:', error)
      toast.error('An unexpected error occurred')
      return { error }
    }
  }

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset for:', email)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        console.error('Password reset error:', error.message)
        toast.error(error.message || 'Failed to send reset email')
        return { error }
      }

      console.log('Password reset email sent')
      toast.success('Password reset email sent!')
      return { error: null }
    } catch (error: any) {
      console.error('Unexpected password reset error:', error)
      toast.error('An unexpected error occurred')
      return { error }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        profile,
        login,
        logout,
        loading,
        signUp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the Auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
