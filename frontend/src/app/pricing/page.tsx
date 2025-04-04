'use client'

import React from 'react'
import { useLocalization } from '@/context/LocalizationContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

// Define pricing tiers
const pricingTiers = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Essential tools for managing your finances',
    price: {
      monthly: 0,
      annually: 0,
    },
    features: [
      'Loan tracking and management',
      'Basic investment calculator',
      'Financial goal setting',
      'Unlimited accounts',
    ],
    buttonText: 'Get Started',
    highlighted: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Advanced tools for optimizing your wealth building',
    price: {
      monthly: 9.99,
      annually: 99.99,
    },
    features: [
      'All Basic features',
      'WealthOptimizer™ tool',
      'Investment portfolio tracking',
      'Advanced tax optimization',
      'Personalized recommendations',
      'Financial independence calculator',
      'Priority support',
    ],
    buttonText: 'Upgrade Now',
    highlighted: true,
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Share premium features with up to 5 family members',
    price: {
      monthly: 19.99,
      annually: 199.99,
    },
    features: [
      'All Premium features',
      'Up to 5 family members',
      'Family dashboard',
      'Shared financial goals',
      'Household spending analysis',
      'Estate planning tools',
      'Priority support with dedicated advisor',
    ],
    buttonText: 'Choose Family',
    highlighted: false,
  },
]

export default function Pricing() {
  const { t, formatCurrency } = useLocalization()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [billingPeriod, setBillingPeriod] = React.useState<
    'monthly' | 'annually'
  >('monthly')

  // Handle subscription button click
  const handleSubscribe = (tierId: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/pricing')
      return
    }

    // For now, just log the subscription intent
    console.log(`User selected ${tierId} plan with ${billingPeriod} billing`)

    // In a real implementation, this would redirect to a payment page or open a checkout modal
    if (tierId !== 'basic') {
      alert(
        `This would redirect to payment processing for the ${tierId} plan with ${billingPeriod} billing.`
      )
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Choose the plan that works best for your financial journey. All plans
          come with a 14-day free trial.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center mt-8 mb-12">
          <span
            className={`mr-3 ${billingPeriod === 'monthly' ? 'font-bold' : 'text-gray-500'}`}
          >
            Monthly
          </span>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              billingPeriod === 'annually'
                ? 'bg-blue-600'
                : 'bg-gray-300 dark:bg-gray-700'
            }`}
            onClick={() =>
              setBillingPeriod((prev) =>
                prev === 'monthly' ? 'annually' : 'monthly'
              )
            }
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                billingPeriod === 'annually' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span
            className={`ml-3 ${billingPeriod === 'annually' ? 'font-bold' : 'text-gray-500'}`}
          >
            Annually{' '}
            <span className="text-green-600 text-sm font-medium">Save 16%</span>
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {pricingTiers.map((tier) => (
          <Card
            key={tier.id}
            className={`flex flex-col ${
              tier.highlighted
                ? 'border-blue-600 shadow-lg dark:border-blue-500'
                : ''
            }`}
          >
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  {formatCurrency(tier.price[billingPeriod])}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  {billingPeriod === 'monthly' ? '/month' : '/year'}
                </span>
              </div>
              <ul className="space-y-3">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 shrink-0 mr-2 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full ${tier.highlighted ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                onClick={() => handleSubscribe(tier.id)}
              >
                {tier.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto mt-8 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Can I cancel at any time?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Yes, you can cancel your subscription at any time. If you
                cancel, you'll still have access to premium features until the
                end of your billing period.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                How does the 14-day trial work?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                When you sign up for any paid plan, you get full access to all
                features for 14 days without being charged. If you decide it's
                not for you, cancel before the trial ends and you won't be
                billed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Are there any contracts or commitments?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                No long-term contracts or commitments. Premium and Family plans
                are subscription-based and renew automatically until canceled.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
