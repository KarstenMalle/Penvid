// layout.tsx
'use client'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'
import { useEffect, useState } from 'react'

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
    <AuthProvider>
      <html lang="en">
        <body className="font-['Overpass']" suppressHydrationWarning>
          {isClient ? (
            <ThemeProvider>
              <Navbar />
              <main className="max-w-screen-xl mx-auto px-0 py-6">
                {children}
              </main>
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
    </AuthProvider>
  )
}
