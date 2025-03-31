// src/components/Navbar.tsx (updated)

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLocalization } from '@/context/LocalizationContext'
import { User, Settings, LogOut, Moon, Sun, Globe } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, logout, user, profile } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t, locale, languages } = useLocalization()

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Define different navigation links based on auth state
  const authenticatedLinks = [
    { name: t('nav.dashboard'), href: '/dashboard' },
    { name: t('nav.loans'), href: '/loans' },
    { name: t('nav.wealthTools'), href: '/wealth-tools' },
  ]

  const unauthenticatedLinks = [
    { name: t('nav.whatIsPenvid'), href: '/what-is-penvid' },
    { name: t('nav.pricing'), href: '/pricing' },
    { name: t('nav.contact'), href: '/contact' },
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

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  // Get display name for the account dropdown
  const getDisplayName = () => {
    return profile?.name || user?.email?.split('@')[0] || 'Account'
  }

  if (!mounted) {
    return null
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Logo and desktop navigation */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-3xl font-bold mr-6 text-gray-800 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
              style={{
                fontFamily: 'PaytoneOne',
                textTransform: 'uppercase',
              }}
            >
              Penvid
            </Link>

            {/* Desktop navigation */}
            <div className="hidden sm:block">
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
          <div className="hidden sm:flex items-center space-x-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={profile?.avatar_url || ''}
                        alt={getDisplayName()}
                      />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="cursor-pointer w-full flex items-center"
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>{t('nav.profile')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className="cursor-pointer w-full flex items-center"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{t('nav.settings')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings/language"
                        className="cursor-pointer w-full flex items-center"
                      >
                        <Globe className="mr-2 h-4 w-4" />
                        <span>
                          {t('settings.language')}: {languages[locale].flag}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setTheme(theme === 'light' ? 'dark' : 'light')
                      }
                      className="cursor-pointer"
                    >
                      {theme === 'light' ? (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          <span>{t('theme.dark')}</span>
                        </>
                      ) : (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          <span>{t('theme.light')}</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-500"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('nav.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-lg font-medium text-gray-800 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-2 rounded-md"
                >
                  {t('nav.login')}
                </Link>
                <Link href="/register">
                  <Button className="px-4 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800 active:bg-blue-700 transition-colors">
                    {t('nav.startFreeTrial')}
                  </Button>
                </Link>
              </>
            )}
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
            <>
              <Link
                href="/profile"
                className="block text-lg font-medium transition-colors px-3 py-2 rounded-md text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.profile')}
              </Link>
              <Link
                href="/settings"
                className="block text-lg font-medium transition-colors px-3 py-2 rounded-md text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.settings')}
              </Link>
              <Link
                href="/settings/language"
                className="block text-lg font-medium transition-colors px-3 py-2 rounded-md text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('settings.language')}
              </Link>
              <button
                onClick={() => {
                  setTheme(theme === 'light' ? 'dark' : 'light')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left text-lg font-medium transition-colors px-3 py-2 rounded-md text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'light' ? t('theme.dark') : t('theme.light')}
              </button>
              <Button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                variant="outline"
                className="w-full text-lg font-medium mt-2"
              >
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <div className="space-y-2 pt-4">
              <Link
                href="/login"
                className="block text-center text-lg font-medium text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/register"
                className="block text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full px-4 py-2 bg-blue-900 text-white font-medium rounded-md">
                  {t('nav.startFreeTrial')}
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </nav>
  )
}
