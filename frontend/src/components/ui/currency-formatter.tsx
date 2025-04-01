// frontend/src/components/ui/currency-formatter.tsx

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

  // Ensure maximumFractionDigits is within the valid range (0-20)
  const safeMaxFractionDigits = Math.max(0, Math.min(20, maximumFractionDigits))
  // Ensure minimumFractionDigits is within the valid range (0-20)
  const safeMinFractionDigits = Math.max(0, Math.min(20, minimumFractionDigits))
  // Ensure minimumFractionDigits <= maximumFractionDigits
  const finalMinFractionDigits = Math.min(
    safeMinFractionDigits,
    safeMaxFractionDigits
  )

  return (
    <span className={className}>
      {formatCurrency(value, {
        maximumFractionDigits: safeMaxFractionDigits,
        minimumFractionDigits: finalMinFractionDigits,
        style: showSymbol ? 'currency' : 'decimal',
        originalCurrency,
      })}
    </span>
  )
}
