// frontend/src/app/settings/layout.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { UserIcon, Settings, Bell, Shield, Palette, Globe } from 'lucide-react'

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: '/settings',
      label: 'Account',
      icon: <UserIcon className="mr-2 h-4 w-4" />,
      active: pathname === '/settings',
    },
    {
      href: '/settings/appearance',
      label: 'Appearance',
      icon: <Palette className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/appearance',
    },
    {
      href: '/settings/language',
      label: 'Language',
      icon: <Globe className="mr-2 h-4 w-4" />, // Add this Lucide icon import
      active: pathname === '/settings/language',
    },
    {
      href: '/settings/notifications',
      label: 'Notifications',
      icon: <Bell className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/notifications',
    },
    {
      href: '/settings/security',
      label: 'Security',
      icon: <Shield className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/security',
    },
  ]

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  route.active
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                  'justify-start'
                )}
              >
                {route.icon}
                {route.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
