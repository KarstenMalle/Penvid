// frontend/src/context/ApiConnectionContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { checkApiConnection } from '@/utils/apiHelpers'
import { ConnectionError } from '@/components/common/ConnectionError'

interface ApiConnectionContextType {
  connected: boolean
  loading: boolean
  lastChecked: Date | null
  checkConnection: () => Promise<boolean>
}

const ApiConnectionContext = createContext<ApiConnectionContextType>({
  connected: false,
  loading: true,
  lastChecked: null,
  checkConnection: async () => false,
})

export function useApiConnection() {
  return useContext(ApiConnectionContext)
}

interface ApiProviderProps {
  children: ReactNode
}

export function ApiProvider({ children }: ApiProviderProps) {
  const [connected, setConnected] = useState<boolean>(true) // Assume connected initially
  const [loading, setLoading] = useState<boolean>(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const checkConnection = async () => {
    setLoading(true)
    const isConnected = await checkApiConnection()
    setConnected(isConnected)
    setLastChecked(new Date())
    setLoading(false)
    return isConnected
  }

  // Check connection on mount
  useEffect(() => {
    checkConnection()
  }, [])

  // If disconnected, set up a periodic check
  useEffect(() => {
    if (!connected && retryCount < 3) {
      const timer = setTimeout(() => {
        checkConnection()
        setRetryCount((prev) => prev + 1)
      }, 5000) // Check every 5 seconds

      return () => clearTimeout(timer)
    }
  }, [connected, retryCount])

  // If we're not connected after retries, show error state
  if (!connected && !loading && retryCount >= 3) {
    return (
      <ConnectionError
        onRetry={() => {
          setRetryCount(0)
          checkConnection()
        }}
      />
    )
  }

  const value = {
    connected,
    loading,
    lastChecked,
    checkConnection,
  }

  return (
    <ApiConnectionContext.Provider value={value}>
      {children}
    </ApiConnectionContext.Provider>
  )
}
