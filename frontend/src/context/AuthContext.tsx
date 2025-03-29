'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  const router = useRouter()

  // Check for active session on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          setIsAuthenticated(true)
          setUser(session.user)

          // Fetch user profile if user is authenticated
          if (session.user) {
            await fetchUserProfile(session.user.id)
          }
        } else {
          setIsAuthenticated(false)
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('Error checking auth session:', error)
        setIsAuthenticated(false)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        setIsAuthenticated(true)
        setUser(session.user)

        // Fetch user profile
        await fetchUserProfile(session.user.id)
      } else {
        setIsAuthenticated(false)
        setUser(null)
        setProfile(null)
      }
    })

    checkSession()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Helper function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      if (data) {
        setProfile(data as UserProfile)
      } else {
        // If no profile exists, try to create one
        await createUserProfile(userId)
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    }
  }

  // Helper function to create a user profile
  const createUserProfile = async (userId: string, name?: string) => {
    try {
      const { error } = await supabase.from('profiles').insert([
        {
          id: userId,
          name: name || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      if (error) {
        console.error('Error creating profile:', error)
        return
      }

      // Fetch the newly created profile
      await fetchUserProfile(userId)
    } catch (error) {
      console.error('Error in createUserProfile:', error)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message || 'Login failed')
        return { error }
      }

      toast.success('Login successful!')
      return { error: null }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error('An unexpected error occurred')
      return { error }
    }
  }

  const logout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Error during logout:', error)
        toast.error('Error logging out')
        return
      }

      // Clear local state
      setIsAuthenticated(false)
      setUser(null)
      setProfile(null)

      // Show success toast
      toast.success('Logged out successfully')

      // Navigate to home
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error logging out')
    }
  }

  const signUp = async (
    email: string,
    password: string,
    metaData?: { name?: string }
  ) => {
    try {
      // First, check if the user already exists
      const { data: existingUsers, error: searchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', email)

      if (searchError) {
        console.error('Error checking for existing user:', searchError)
      }

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metaData,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast.error(error.message || 'Registration failed')
        return { error }
      }

      // Manual creation of profile if needed
      if (data.user) {
        try {
          // Wait a moment to ensure the user is registered in the auth system
          setTimeout(async () => {
            await createUserProfile(data.user!.id, metaData?.name)
          }, 1000)
        } catch (profileError) {
          console.error('Error ensuring profile:', profileError)
        }
      }

      toast.success(
        'Registration successful! Please check your email to confirm your account.'
      )
      return { error: null }
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error('An unexpected error occurred')
      return { error }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message || 'Failed to send reset email')
        return { error }
      }

      toast.success('Password reset email sent!')
      return { error: null }
    } catch (error: any) {
      console.error('Password reset error:', error)
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
