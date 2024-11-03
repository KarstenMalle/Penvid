'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Settings', href: '/settings' },
  { name: 'Profile', href: '/profile' },
  { name: 'Help', href: '/help' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <div className="relative shadow-md">
      <ScrollArea className="max-w-full lg:max-w-none">
        <div className="flex items-center space-x-4 px-6 py-3">
          {navLinks.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              className={cn(
                'flex h-8 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors hover:text-primary',
                pathname === link.href
                  ? 'bg-muted text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  )
}
