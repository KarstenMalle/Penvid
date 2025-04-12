import { AppProps } from 'next/app'
import { AuthProvider } from '@/context/AuthContext'
import { LocalizationProvider } from '@/context/LocalizationContext'
import { HealthCheck } from '@/components/HealthCheck'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <LocalizationProvider>
        <div className="min-h-screen bg-gray-50">
          <HealthCheck />
          <Component {...pageProps} />
        </div>
      </LocalizationProvider>
    </AuthProvider>
  )
} 