'use client'

import React from 'react'

interface PasswordStrengthIndicatorProps {
  score: number
}

export function PasswordStrengthIndicator({
  score,
}: PasswordStrengthIndicatorProps) {
  let strengthLabel = ''
  let strengthColor = ''

  if (score <= 20) {
    strengthLabel = 'Very Weak'
    strengthColor = 'bg-red-500'
  } else if (score <= 40) {
    strengthLabel = 'Weak'
    strengthColor = 'bg-orange-500'
  } else if (score <= 60) {
    strengthLabel = 'Medium'
    strengthColor = 'bg-yellow-500'
  } else if (score <= 80) {
    strengthLabel = 'Strong'
    strengthColor = 'bg-green-500'
  } else {
    strengthLabel = 'Very Strong'
    strengthColor = 'bg-green-600'
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">Password strength:</span>
        <span className="text-xs font-medium">{strengthLabel}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${strengthColor} transition-all duration-300`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  )
}
