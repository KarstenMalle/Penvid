'use client'

import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LanguageProvider } from '@/context/LanguageContext'
import Navbar from '@/components/Navbar'
import { usePathname, useParams, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import './globals.css'

// Loading component for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isClient, setIsClient] = useState(false)
  const pathname = usePathname()

  // Enable client-side rendering to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Define routes where Navbar should be excluded
  const noNavbarRoutes = [
    '/register',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
  ]

  const showNavbar = !noNavbarRoutes.some((route) =>
    pathname?.startsWith(route)
  )

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Penvid - Do money differently</title>
        <meta
          name="description"
          content="Penvid has helped millions learn to spend, save, and live joyfully with a simple set of life-changing habits."
        />
      </head>
      <body className="font-['Overpass'] min-h-screen" suppressHydrationWarning>
        <Suspense fallback={<LoadingSpinner />}>
          <AuthProvider>
            <LanguageProvider>
              {isClient ? (
                <ThemeProvider>
                  {showNavbar && <Navbar />}
                  <main
                    className={
                      showNavbar ? 'min-h-[calc(100vh-4rem)]' : 'min-h-screen'
                    }
                  >
                    {children}
                  </main>
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 5000,
                      style: {
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: '#333',
                        color: '#fff',
                      },
                    }}
                  />
                </ThemeProvider>
              ) : (
                <div className="opacity-0">
                  {showNavbar && <Navbar />}
                  <main className="min-h-screen">{children}</main>
                </div>
              )}
            </LanguageProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
