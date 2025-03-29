'use client'

import React, { ReactNode } from 'react'
import Link from 'next/link'
import AuthBackground from '@/components/AuthBackground'

interface AuthLayoutProps {
  children: ReactNode
  heading: string
  subheading?: string
}

export default function AuthLayout({
  children,
  heading,
  subheading,
}: AuthLayoutProps) {
  return (
    <AuthBackground backgroundColor="bg-gradient-to-r from-blue-900 to-indigo-950">
      <div className="container mx-auto flex h-[800px] w-full max-w-7xl items-center justify-center px-6 lg:px-4">
        <Link
          href="/"
          className="absolute left-6 top-6 md:left-12 md:top-12 text-3xl md:text-5xl font-bold text-white hover:text-gray-300"
          style={{
            fontFamily: 'PaytoneOne',
            textTransform: 'uppercase',
          }}
        >
          Penvid
        </Link>

        {/* Left Column - Branding Message */}
        <div className="hidden h-full flex-col justify-center p-10 text-white lg:flex lg:w-1/2 lg:px-12 lg:pr-20">
          <div className="relative z-10">
            <h2 className="text-4xl font-bold">Do money differently.</h2>
            <p className="mt-4 text-lg">
              Penvid has helped millions learn to spend, save, and live joyfully
              with a simple set of life-changing habits.
            </p>
          </div>
        </div>

        {/* Right Column - Auth Form */}
        <div className="flex w-full flex-col items-center justify-center lg:w-2/5 lg:p-10 bg-white rounded-lg shadow-lg">
          <div className="w-full max-w-md space-y-6 p-6">
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-gray-800">
                {heading}
              </h1>
              {subheading && (
                <p className="mt-4 text-md text-gray-600">{subheading}</p>
              )}
            </div>

            {children}
          </div>
        </div>
      </div>
    </AuthBackground>
  )
}
