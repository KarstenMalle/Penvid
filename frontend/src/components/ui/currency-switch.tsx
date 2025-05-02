// frontend/src/components/ui/currency-switch.tsx
'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useLocalization } from '@/context/LocalizationContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CurrencySwitchProps {
  minimal?: boolean
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'ghost'
}

export function CurrencySwitch({
  minimal = false,
  size = 'default',
  variant = 'default',
}: CurrencySwitchProps) {
  const { currency, setCurrency, currencies } = useLocalization()
  const pathname = usePathname()

  // Check if we're in the settings page
  const isSettingsPage = pathname?.includes('/settings/currency')

  // If not in settings page and not minimal, don't render
  if (!isSettingsPage && !minimal) {
    return null
  }

  // If not in settings page, render as read-only
  if (!isSettingsPage) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn(
          'flex items-center gap-1',
          minimal && 'text-sm px-2 py-1 h-auto min-h-0'
        )}
        disabled
      >
        <span>{currencies[currency].flag}</span>
        {!minimal && <span>{currencies[currency].displayName}</span>}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            'flex items-center gap-1',
            minimal && 'text-sm px-2 py-1 h-auto min-h-0'
          )}
        >
          <span>{currencies[currency].flag}</span>
          {!minimal && <span>{currencies[currency].displayName}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(currencies).map(([code, info]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setCurrency(code as any)}
            className={cn(
              'flex items-center gap-2',
              currency === code && 'bg-accent text-accent-foreground'
            )}
          >
            <span>{info.flag}</span>
            <span>{info.displayName}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
