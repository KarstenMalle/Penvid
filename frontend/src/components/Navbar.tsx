'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { isAuthenticated } = useAuth()

  const navLinks = isAuthenticated
    ? [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Settings', href: '/settings' },
        { name: 'Profile', href: '/profile' },
        { name: 'Help', href: '/help' },
      ]
    : [
        { name: 'What is Penvid', href: '/what-is-penvid' },
        { name: 'Pricing', href: '/pricing' },
      ]

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
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
          <div className="absolute inset-y-0 right-0 flex items-center space-x-4 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <Link
              href="/login"
              className="text-lg font-medium text-gray-800 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-2 rounded-md"
            >
              Log In
            </Link>
            <Link href="/register">
              <button className="px-4 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800 active:bg-blue-700 transition-colors">
                Start Your Free Trial
              </button>
            </Link>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full"
              aria-label="Toggle theme"
            >
              <Image
                src={
                  theme === 'light'
                    ? '/theme-light-mode.svg'
                    : '/theme-dark-mode.svg'
                }
                alt="Theme Icon"
                width={20}
                height={20}
                className={`h-5 w-5 ${theme === 'dark' ? 'filter invert' : ''}`} // Dark mode inverts icon color
              />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
