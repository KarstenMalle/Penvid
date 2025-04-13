'use client'

import React, { ReactNode, useEffect, useState } from 'react'

interface AnimatedContainerProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function AnimatedContainer({
  children,
  delay = 0,
  className = '',
}: AnimatedContainerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay * 1000)

    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`transition-all duration-500 ${
        isVisible
          ? 'opacity-100 transform translate-y-0'
          : 'opacity-0 transform translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  )
}
