'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

// Define types for the context and state
interface AuthContextType {
  isAuthenticated: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check authentication status on initial load
    const isLoggedIn = localStorage.getItem('auth') === 'true'
    setIsAuthenticated(isLoggedIn)
  }, [])

  const login = () => {
    setIsAuthenticated(true)
    localStorage.setItem('auth', 'true')
    router.push('/dashboard')
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('auth')
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
