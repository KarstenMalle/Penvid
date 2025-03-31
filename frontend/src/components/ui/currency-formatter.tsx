// src/components/ui/currency-formatter.tsx

'use client'

import React from 'react'
import { useLocalization } from '@/context/LocalizationContext'

interface CurrencyFormatterProps {
  value: number
  maximumFractionDigits?: number
  minimumFractionDigits?: number
  className?: string
  showSymbol?: boolean
  originalCurrency?: 'USD' | 'DKK' // Optional: Specify if value is already in a specific currency
}

export function CurrencyFormatter({
  value,
  maximumFractionDigits = 0,
  minimumFractionDigits = 0,
  className,
  showSymbol = true,
  originalCurrency = 'USD', // Default assumption: values in components are stored in USD
}: CurrencyFormatterProps) {
  const { formatCurrency } = useLocalization()

  return (
    <span className={className}>
      {formatCurrency(value, {
        maximumFractionDigits,
        minimumFractionDigits,
        style: showSymbol ? 'currency' : 'decimal',
        originalCurrency,
      })}
    </span>
  )
}
