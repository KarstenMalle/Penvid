// frontend/src/components/ui/error-message.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  message: string
  className?: string
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div
      className={cn(
        'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4',
        className
      )}
      role="alert"
    >
      <span className="block sm:inline">{message}</span>
    </div>
  )
}
