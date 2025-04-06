// frontend/src/pages/debug/page.tsx

'use client'

import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/navigation'
import CurrencyDebugger from '@/components/debug/CurrencyDebugger'
import PaymentAnalysisDebugger from '@/components/debug/PaymentAnalysisDebugger'

/**
 * Debug page for development use only
 */
const DebugPage: React.FC = () => {
  const router = useRouter()

  // Only show in development environment
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (!isDevelopment) {
    if (typeof window !== 'undefined') {
      router.push('/')
    }
    return null
  }

  return (
    <>
      <Head>
        <title>Debug Tools - Penvid</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Penvid Debug Tools</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="text-yellow-700">
            These debug tools are for development purposes only. They should not
            be used in production.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            Currency Conversion Testing
          </h2>
          <CurrencyDebugger />
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Payment Analysis Testing</h2>
          <PaymentAnalysisDebugger />
        </div>
      </div>
    </>
  )
}

export default DebugPage
