// layout.tsx
'use client'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/context/AuthContext'
import { CurrencyProvider } from '@/context/CurrencyContext'
import { LocalizationProvider } from '@/context/LocalizationContext'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'
import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isClient, setIsClient] = useState(false)

  // Enable client-side rendering to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <LocalizationProvider>
            <html lang="en">
              <body className="font-['Overpass']" suppressHydrationWarning>
                {isClient ? (
                  <ThemeProvider>
                    <Navbar />
                    <main className="max-w-screen-xl mx-auto px-0 py-6">
                      {children}
                    </main>
                    <Toaster position="top-right" />
                  </ThemeProvider>
                ) : (
                  <div>
                    <Navbar />
                    <main className="max-w-screen-xl mx-auto px-0 py-6">
                      {children}
                    </main>
                  </div>
                )}
              </body>
            </html>
          </LocalizationProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
