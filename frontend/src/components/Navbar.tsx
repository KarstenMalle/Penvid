// frontend/src/components/Navbar.tsx

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, logout, user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Define different navigation links based on auth state
  const authenticatedLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Wealth Tools', href: '/wealth-tools' },
    { name: 'Settings', href: '/settings' },
    { name: 'Profile', href: '/profile' },
  ]

  const unauthenticatedLinks = [
    { name: 'What is Penvid', href: '/what-is-penvid' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Contact', href: '/contact' },
  ]

  const navLinks = isAuthenticated ? authenticatedLinks : unauthenticatedLinks

  const handleLogout = async () => {
    try {
      await logout()
      // Toast notification will be handled by the AuthContext
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to log out')
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Logo and desktop navigation */}
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <Link
              href="/"
              className="text-3xl font-bold mr-4 text-gray-800 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
              style={{
                fontFamily: 'PaytoneOne',
                textTransform: 'uppercase',
              }}
            >
              Penvid
            </Link>

            {/* Desktop navigation */}
            <div className="hidden sm:block sm:ml-6">
              <div className="flex space-x-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative text-lg font-medium transition-colors px-3 py-2 rounded-md ${
                      pathname === link.href
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg'
                        : 'text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              className="text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Right side actions */}
          <div className="hidden sm:flex items-center space-x-4 pr-2">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-800 dark:text-white">
                  {user?.email || 'User'}
                </span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="text-lg font-medium"
                >
                  Log Out
                </Button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-lg font-medium text-gray-800 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-2 rounded-md"
                >
                  Log In
                </Link>
                <Link href="/register">
                  <Button className="px-4 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800 active:bg-blue-700 transition-colors">
                    Start Your Free Trial
                  </Button>
                </Link>
              </>
            )}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full"
              aria-label="Toggle theme"
            >
              {mounted && (
                <Image
                  src={
                    theme === 'light'
                      ? '/theme-light-mode.svg'
                      : '/theme-dark-mode.svg'
                  }
                  alt="Theme Icon"
                  width={20}
                  height={20}
                  className={`h-5 w-5 ${theme === 'dark' ? 'filter invert' : ''}`}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on state */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="sm:hidden bg-white dark:bg-gray-800 px-2 pt-2 pb-3 space-y-1"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block text-lg font-medium transition-colors px-3 py-2 rounded-md ${
                pathname === link.href
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold'
                  : 'text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          {isAuthenticated ? (
            <Button
              onClick={() => {
                handleLogout()
                setMobileMenuOpen(false)
              }}
              variant="outline"
              className="w-full text-lg font-medium mt-2"
            >
              Log Out
            </Button>
          ) : (
            <div className="space-y-2 pt-4">
              <Link
                href="/login"
                className="block text-center text-lg font-medium text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="block text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full px-4 py-2 bg-blue-900 text-white font-medium rounded-md">
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </nav>
  )
}
