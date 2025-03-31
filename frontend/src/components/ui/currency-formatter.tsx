// frontend/src/components/ui/currency-formatter.tsx
'use client'

import React from 'react'
import { useLocalization } from '@/context/LocalizationContext'

interface CurrencyFormatterProps {
  value: number
  maximumFractionDigits?: number
  minimumFractionDigits?: number
  className?: string
  showSymbol?: boolean
}

export function CurrencyFormatter({
  value,
  maximumFractionDigits = 0,
  minimumFractionDigits = 0,
  className,
  showSymbol = true,
}: CurrencyFormatterProps) {
  const { formatCurrency } = useLocalization()

  return (
    <span className={className}>
      {formatCurrency(value, {
        maximumFractionDigits,
        minimumFractionDigits,
        style: showSymbol ? 'currency' : 'decimal',
      })}
    </span>
  )
}
