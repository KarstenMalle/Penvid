import React from 'react'
import { cn } from '@/lib/utils'

interface PasswordStrengthIndicatorProps {
  score: number
  className?: string
}

export function PasswordStrengthIndicator({
  score,
  className,
}: PasswordStrengthIndicatorProps) {
  // Get the color and label based on the score
  const getColorAndLabel = (score: number) => {
    if (score < 20) return { color: 'bg-red-500', label: 'Very Weak' }
    if (score < 40) return { color: 'bg-orange-500', label: 'Weak' }
    if (score < 60) return { color: 'bg-yellow-500', label: 'Fair' }
    if (score < 80) return { color: 'bg-blue-500', label: 'Good' }
    return { color: 'bg-green-500', label: 'Strong' }
  }

  const { color, label } = getColorAndLabel(score)

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between items-center mb-1">
        <div className="h-2 w-full bg-gray-200 rounded-full">
          <div
            className={cn('h-full rounded-full', color)}
            style={{ width: `${score}%` }}
          ></div>
        </div>
        <span className="text-xs ml-2 w-16">{label}</span>
      </div>
    </div>
  )
}
