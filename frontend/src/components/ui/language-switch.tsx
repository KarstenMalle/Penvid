// src/components/ui/language-switch.tsx

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
import { Locale } from '@/i18n/config'

interface LanguageSwitchProps {
  minimal?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg' | 'icon'
}

export function LanguageSwitch({
  minimal = false,
  variant = 'outline',
  size = 'default',
}: LanguageSwitchProps) {
  const { locale, setLocale, languages, t } = useLocalization()
  const [isChanging, setIsChanging] = useState(false)

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale || isChanging) return

    setIsChanging(true)
    try {
      await setLocale(newLocale)
    } catch (error) {
      console.error('Failed to change language:', error)
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
              {languages[locale].flag}
              {isChanging && <span className="ml-1 animate-spin">⟳</span>}
            </>
          ) : (
            <>
              {languages[locale].flag} {languages[locale].displayName}
              {isChanging && <span className="ml-2 animate-spin">⟳</span>}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languages).map(([code, languageInfo]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as Locale)}
            className="cursor-pointer"
          >
            <span className="mr-2">{languageInfo.flag}</span>
            <span>{languageInfo.displayName}</span>
            {code === locale && <span className="ml-2 text-blue-600">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
