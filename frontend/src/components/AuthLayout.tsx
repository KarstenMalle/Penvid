'use client'

import React, { ReactNode } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface AuthLayoutProps {
  children: ReactNode
  heading: string
  subheading: ReactNode | string
}

export default function AuthLayout({
  children,
  heading,
  subheading,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-blue-600">Penvid</h1>
          </Link>
        </div>
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold">{heading}</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {subheading}
              </p>
            </div>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
