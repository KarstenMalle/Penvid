'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function DashboardPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null // Prevent rendering until authentication is verified

  return (
    <main className="p-8">
      <h1>Welcome to the Dashboard</h1>
      <p>Here is your application content.</p>
    </main>
  )
}
