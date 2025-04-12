// frontend/src/components/common/ConnectionError.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { ServerIcon, WifiIcon } from '@heroicons/react/24/outline'

interface ConnectionErrorProps {
  onRetry: () => void
}

export function ConnectionError({ onRetry }: ConnectionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="relative mb-6">
        <ServerIcon className="h-16 w-16 text-gray-400" />
        <div className="absolute top-0 right-0">
          <WifiIcon className="h-8 w-8 text-red-500" />
          <div className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-red-500 -rotate-45 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-2">Connection Error</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        Unable to connect to the server. This could be due to network issues or
        the server may be offline.
      </p>

      <div className="flex gap-4">
        <Button onClick={onRetry}>Try Again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>If the problem persists:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Check your internet connection</li>
          <li>Ensure the backend server is running</li>
          <li>Try again in a few minutes</li>
        </ul>
      </div>
    </div>
  )
}
