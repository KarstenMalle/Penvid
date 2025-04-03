'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-browser'

interface SubscriptionTier {
  name: string
  isPremium: boolean
}

interface ToolCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  isPremium: boolean
  comingSoon?: boolean
}

export default function WealthToolsPage() {
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

  // Define custom icons for tool cards
  const ChartIcon1 = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  )

  const ChartIcon2 = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
      />
    </svg>
  )

  const ChartIcon3 = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )

  const ChartIcon4 = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )

  // Tool cards for the wealth tools page
  const toolCards: ToolCard[] = [
    {
      id: 'wealth-optimizer',
      title: 'WealthOptimizer™',
      description:
        'Determine the optimal strategy for allocating funds between loan payments and investments.',
      icon: <ChartIcon1 />,
      href: '/wealth-tools/wealth-optimizer',
      isPremium: true,
    },
    {
      id: 'loan-manager',
      title: 'Loan Manager',
      description:
        'Track all your loans in one place and visualize your path to debt freedom.',
      icon: <ChartIcon2 />,
      href: '/wealth-tools/loan-manager',
      isPremium: false,
    },
    {
      id: 'investment-tracker',
      title: 'Investment Tracker',
      description:
        'Track your investments, analyze performance, and visualize growth.',
      icon: <ChartIcon3 />,
      href: '/wealth-tools/investment-tracker',
      isPremium: true,
      comingSoon: false,
    },
    {
      id: 'financial-independence',
      title: 'FI Calculator',
      description:
        'Calculate your path to financial independence and early retirement.',
      icon: <ChartIcon4 />,
      href: '/wealth-tools/fi-calculator',
      isPremium: true,
      comingSoon: true,
    },
  ]

  // Loading state
  if (loading || (isAuthenticated && isLoadingSubscription)) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-lg text-gray-600">Loading wealth tools...</p>
        </div>
      </div>
    )
  }

  // For unauthenticated users, show login prompt with preview
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-5xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Penvid Wealth Tools</CardTitle>
            <CardDescription>
              Sign in to access these powerful wealth-building tools
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center p-6">
            <p className="mb-6">
              You need to be logged in to access Penvid's wealth tools.
            </p>
            <Button
              className="mx-auto"
              onClick={() =>
                (window.location.href = '/login?redirect=/wealth-tools')
              }
            >
              Sign In
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {toolCards.map((tool) => (
            <Card
              key={tool.id}
              className={`relative ${tool.isPremium ? 'border-blue-200' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/20">
                    {tool.icon}
                  </div>
                  {tool.isPremium && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">
                      Premium
                    </span>
                  )}
                  {tool.comingSoon && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-amber-900/30 dark:text-amber-300">
                      Coming Soon
                    </span>
                  )}
                </div>
                <CardTitle className="mt-4">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="opacity-60">
                  <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                    <p className="text-center text-sm">
                      Preview available after login
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Main content for authenticated users
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Wealth Tools</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Tools to help you build wealth, manage debt, and achieve financial
          independence
        </p>

        {userSubscription && !userSubscription.isPremium && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 flex justify-between items-center">
            <div>
              <p className="font-medium">
                Upgrade to Premium for full access to all wealth tools
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get personalized recommendations, advanced analytics, and more
              </p>
            </div>
            <Button className="ml-4 whitespace-nowrap">Upgrade Now</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {toolCards.map((tool) => {
          const isAccessible =
            !tool.isPremium || (userSubscription && userSubscription.isPremium)
          const isDisabled =
            tool.comingSoon || (tool.isPremium && !userSubscription?.isPremium)

          return (
            <Card
              key={tool.id}
              className={`relative transition-all duration-300 ${
                tool.isPremium ? 'border-blue-200 dark:border-blue-800' : ''
              } ${isDisabled ? 'opacity-70' : 'hover:shadow-md'}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/20">
                    {tool.icon}
                  </div>
                  <div className="flex space-x-2">
                    {tool.isPremium && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">
                        Premium
                      </span>
                    )}
                    {tool.comingSoon && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-amber-900/30 dark:text-amber-300">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
                <CardTitle className="mt-4">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {tool.comingSoon ? (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      This feature is being built and will be available soon!
                    </p>
                  </div>
                ) : (
                  <div className="mt-4">
                    {isDisabled ? (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          Available with Premium
                        </p>
                        <Button variant="outline" size="sm">
                          Upgrade
                        </Button>
                      </div>
                    ) : (
                      <Link href={tool.href}>
                        <Button variant="outline" size="sm" className="w-full">
                          Open Tool
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Feature Highlight Section */}
      {isAuthenticated && (
        <div className="mt-16 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Optimize Your Financial Strategy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                Not sure whether to pay down your loans or invest? Our
                WealthOptimizer tool helps you make the right decision for your
                situation.
              </p>
            </div>
            <Link href="/wealth-tools/wealth-optimizer">
              <Button className="whitespace-nowrap">Try WealthOptimizer</Button>
            </Link>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-xl font-bold mb-6">Frequently Asked Questions</h2>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                What's the difference between free and premium tools?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Free tools provide basic functionality to track and manage your
                finances. Premium tools offer advanced analysis, personalized
                recommendations, and comprehensive planning features to optimize
                your financial decisions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                How accurate are the projections?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Our projections use historical market returns adjusted for
                inflation and are designed to give you a realistic picture of
                potential outcomes. However, actual results may vary due to
                market performance, tax changes, and personal circumstances.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Can I use these tools for my specific financial situation?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Yes! Our tools are designed to be flexible and accommodate a
                wide range of financial situations. You can input your specific
                loans, savings, and financial goals to get personalized
                recommendations tailored to your unique circumstances.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
