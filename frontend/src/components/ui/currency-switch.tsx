// src/components/ui/currency-switch.tsx

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocalization } from '@/context/LocalizationContext'
import { Currency } from '@/i18n/config'

interface CurrencySwitchProps {
  minimal?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg' | 'icon'
}

export function CurrencySwitch({
  minimal = false,
  variant = 'outline',
  size = 'default',
}: CurrencySwitchProps) {
  const { currency, setCurrency, currencies, t } = useLocalization()
  const [isChanging, setIsChanging] = useState(false)

  const handleCurrencyChange = async (newCurrency: Currency) => {
    if (newCurrency === currency || isChanging) return

    setIsChanging(true)
    try {
      await setCurrency(newCurrency)
    } catch (error) {
      console.error('Failed to change currency:', error)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isChanging}>
          {minimal ? (
            <>
              {currencies[currency].flag}
              {isChanging && <span className="ml-1 animate-spin">⟳</span>}
            </>
          ) : (
            <>
              {currencies[currency].flag} {currencies[currency].displayName}
              {isChanging && <span className="ml-2 animate-spin">⟳</span>}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(currencies).map(([code, currencyInfo]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleCurrencyChange(code as Currency)}
            className="cursor-pointer"
          >
            <span className="mr-2">{currencyInfo.flag}</span>
            <span>{currencyInfo.displayName}</span>
            {code === currency && <span className="ml-2 text-blue-600">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
