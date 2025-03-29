// frontend/src/app/page.tsx

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import LandingPage from '@/components/LandingPage'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, loading, router])

  // Show skeleton loader while checking auth
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-12 w-48 mb-8" />
        <Skeleton className="h-64 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  // If not authenticated, show landing page
  if (!isAuthenticated) {
    return <LandingPage />
  }

  // This will never render because of the redirect in useEffect
  return null
}
