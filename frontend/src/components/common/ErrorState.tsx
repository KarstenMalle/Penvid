// frontend/src/components/common/ErrorState.tsx
import React from 'react'
import { useLocalization } from '@/context/LocalizationContext'
import { Button } from '@/components/ui/button'
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title,
  message = 'An error occurred while loading data.',
  onRetry,
}: ErrorStateProps) {
  const { t } = useLocalization()

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">
        {title || t('common.error')}
      </h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" className="gap-2">
          <ArrowPathIcon className="h-4 w-4" />
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
