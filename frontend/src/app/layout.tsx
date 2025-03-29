// layout.tsx
'use client'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

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
  const noNavbarRoutes = ['/register', '/login', '/forgot-password']
  const showNavbar = !noNavbarRoutes.includes(pathname!)

  return (
    <AuthProvider>
      <html lang="en">
        <body className="font-['Overpass']" suppressHydrationWarning>
          {isClient ? (
            <ThemeProvider>
              {showNavbar && <Navbar />}
              <main className=" mx-auto px-0">{children}</main>
            </ThemeProvider>
          ) : (
            <div>
              {showNavbar && <Navbar />}
              <main className=" mx-auto px-0">{children}</main>
            </div>
          )}
        </body>
      </html>
    </AuthProvider>
  )
}
