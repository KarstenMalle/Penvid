// components/AuthBackground.tsx
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuthBackgroundProps {
  children: ReactNode
  backgroundColor: string
}

export default function AuthBackground({
  children,
  backgroundColor,
}: AuthBackgroundProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen w-full items-center justify-center',
        backgroundColor
      )}
    >
      <div className="w-full max-w-7xl p-8">{children}</div>
    </div>
  )
}
