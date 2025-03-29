// frontend/src/components/ui/success-message.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface SuccessMessageProps {
  message: string
  className?: string
}

export function SuccessMessage({ message, className }: SuccessMessageProps) {
  if (!message) return null

  return (
    <div
      className={cn(
        'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4',
        className
      )}
      role="alert"
    >
      <span className="block sm:inline">{message}</span>
    </div>
  )
}
