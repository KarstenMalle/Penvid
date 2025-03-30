'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import WealthOptimizer from '@/components/features/wealth-optimizer/WealthOptimizer'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'

interface SubscriptionTier {
  name: string
  isPremium: boolean
}

export default function WealthOptimizerPage() {
  const { user, isAuthenticated, loading } = useAuth()
  const supabase = createClient()
  const [userSubscription, setUserSubscription] =
    useState<SubscriptionTier | null>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)

  // Fetch user's subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isAuthenticated || !user) {
        setIsLoadingSubscription(false)
        return
      }

      setIsLoadingSubscription(true)

      try {
        // This would be replaced with your actual subscription check logic
        // For now, we'll simulate all users having premium access
        setUserSubscription({
          name: 'Premium',
          isPremium: true,
        })
      } catch (error) {
        console.error('Error fetching subscription:', error)
      } finally {
        setIsLoadingSubscription(false)
      }
    }

    fetchSubscription()
  }, [user, isAuthenticated])

  // Loading state when checking auth or subscription
  if (loading || isLoadingSubscription) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // For unauthenticated users, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>WealthOptimizer™</CardTitle>
            <CardDescription>
              Sign in to access this premium wealth-building tool
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center p-6">
            <p className="mb-6">
              You need to be logged in to access the WealthOptimizer tool.
            </p>
            <Button
              className="mx-auto"
              onClick={() =>
                (window.location.href =
                  '/login?redirect=/wealth-tools/wealth-optimizer')
              }
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // For authenticated but non-premium users, show upgrade prompt
  if (!userSubscription?.isPremium) {
    return (
      <div className="container mx-auto p-8 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>WealthOptimizer™</CardTitle>
            <CardDescription>
              Premium feature for strategic financial planning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-center space-y-4">
              <h3 className="text-xl font-semibold">Upgrade to Premium</h3>
              <p>
                WealthOptimizer™ is a premium feature that helps you determine
                the most effective way to allocate your extra monthly income
                between debt paydown and investments.
              </p>
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                  <h4 className="font-medium">
                    With WealthOptimizer™ you can:
                  </h4>
                  <ul className="list-disc list-inside mt-2 text-sm text-left">
                    <li>Compare multiple debt payment strategies</li>
                    <li>Evaluate investment returns vs. debt interest costs</li>
                    <li>
                      Get personalized recommendations for wealth building
                    </li>
                    <li>View long-term financial projections</li>
                    <li>Optimize your path to financial freedom</li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-medium">Premium Benefits Include:</h4>
                    <ul className="list-disc list-inside mt-2 text-sm text-left">
                      <li>Access to all Penvid premium features</li>
                      <li>Advanced financial analysis tools</li>
                      <li>Unlimited financial scenarios</li>
                      <li>Detailed reporting and insights</li>
                    </ul>
                  </div>
                  <Button className="mt-4 w-full">Upgrade Now</Button>
                </div>
              </div>
            </div>
            <div className="mt-6 border rounded-lg overflow-hidden">
              <img
                src="/images/wealth-optimizer-preview.jpg"
                alt="WealthOptimizer preview"
                className="w-full h-auto"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  const target = e.currentTarget as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user is authenticated and has premium access, show the full feature
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">WealthOptimizer™</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Optimize your money between debt paydown and investments to maximize
          long-term wealth
        </p>
      </div>

      <WealthOptimizer />

      <div className="mt-8 text-center">
        <Link href="/wealth-tools">
          <Button variant="outline">Back to Wealth Tools</Button>
        </Link>
      </div>
    </div>
  )
}
