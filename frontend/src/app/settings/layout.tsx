'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { useLocalization } from '@/context/LocalizationContext'
import {
  UserIcon,
  Settings,
  Bell,
  Shield,
  Palette,
  Globe,
  DollarSign,
  Map,
} from 'lucide-react'

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()
  const { t } = useLocalization()

  const routes = [
    {
      href: '/settings',
      label: t('settings.account'),
      icon: <UserIcon className="mr-2 h-4 w-4" />,
      active: pathname === '/settings',
    },
    {
      href: '/settings/appearance',
      label: t('settings.appearance'),
      icon: <Palette className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/appearance',
    },
    {
      href: '/settings/language',
      label: t('settings.language'),
      icon: <Globe className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/language',
    },
    {
      href: '/settings/currency',
      label: t('settings.currency'),
      icon: <DollarSign className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/currency',
    },
    {
      href: '/settings/country',
      label: t('settings.country'),
      icon: <Map className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/country',
    },
    {
      href: '/settings/notifications',
      label: t('settings.notifications'),
      icon: <Bell className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/notifications',
    },
    {
      href: '/settings/security',
      label: t('settings.security'),
      icon: <Shield className="mr-2 h-4 w-4" />,
      active: pathname === '/settings/security',
    },
  ]

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">{t('settings.title')}</h1>
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
