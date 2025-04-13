'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import apiService from '@/lib/api-client'

// Define the supported currencies
export type SupportedCurrency = 'USD' | 'DKK'

// Define the context type
interface CurrencyContextType {
  currency: SupportedCurrency
  setCurrency: (currency: SupportedCurrency) => Promise<void>
  supportedCurrencies: SupportedCurrency[]
  loading: boolean
  error: string | null
}

// Create the currency context
const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
)

// Currency provider component
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [currency, setCurrencyState] = useState<SupportedCurrency>('USD')
  const [supportedCurrencies, setSupportedCurrencies] = useState<
    SupportedCurrency[]
  >(['USD', 'DKK'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load supported currencies
  useEffect(() => {
    const loadSupportedCurrencies = async () => {
      try {
        const currencies = await apiService.getSupportedCurrencies()
        setSupportedCurrencies(currencies as SupportedCurrency[])
      } catch (err) {
        console.error('Failed to load supported currencies:', err)
        setError('Failed to load supported currencies')
      }
    }

    loadSupportedCurrencies()
  }, [])

  // Load user's currency preference if authenticated
  useEffect(() => {
    const loadUserCurrency = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const profile = await apiService.getProfile()

        if (profile && profile.currency_preference) {
          setCurrencyState(profile.currency_preference as SupportedCurrency)
        }
      } catch (err) {
        console.error('Failed to load user currency preference:', err)
        setError('Failed to load currency preference')
      } finally {
        setLoading(false)
      }
    }

    loadUserCurrency()
  }, [isAuthenticated])

  // Function to update currency
  const setCurrency = async (newCurrency: SupportedCurrency) => {
    try {
      setCurrencyState(newCurrency)

      // Only update on backend if user is authenticated
      if (isAuthenticated) {
        await apiService.updateProfile({
          currency_preference: newCurrency,
        })
      }
    } catch (err) {
      console.error('Failed to update currency preference:', err)
      setError('Failed to update currency preference')
      // Revert to previous currency on error
      setCurrencyState(currency)
      throw err
    }
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        supportedCurrencies,
        loading,
        error,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

// Custom hook to use the currency context
export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
