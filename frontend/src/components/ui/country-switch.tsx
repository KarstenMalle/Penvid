// src/components/ui/country-switch.tsx

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
import { Country } from '@/i18n/config'

interface CountrySwitchProps {
  minimal?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg' | 'icon'
}

export function CountrySwitch({
  minimal = false,
  variant = 'outline',
  size = 'default',
}: CountrySwitchProps) {
  const { country, setCountry, countries, t } = useLocalization()
  const [isChanging, setIsChanging] = useState(false)

  const handleCountryChange = async (newCountry: Country) => {
    if (newCountry === country || isChanging) return

    setIsChanging(true)
    try {
      await setCountry(newCountry)
    } catch (error) {
      console.error('Failed to change country:', error)
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
              {countries[country].flag}
              {isChanging && <span className="ml-1 animate-spin">⟳</span>}
            </>
          ) : (
            <>
              {countries[country].flag} {countries[country].displayName}
              {isChanging && <span className="ml-2 animate-spin">⟳</span>}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(countries).map(([code, countryInfo]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleCountryChange(code as Country)}
            className="cursor-pointer"
          >
            <span className="mr-2">{countryInfo.flag}</span>
            <span>{countryInfo.displayName}</span>
            {code === country && <span className="ml-2 text-blue-600">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
