// frontend/src/components/ui/animated-container.tsx
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedContainerProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function AnimatedContainer({
  children,
  className,
  delay = 0,
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
