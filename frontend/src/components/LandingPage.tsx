// frontend/src/components/LandingPage.tsx

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export default function LandingPage() {
  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900 to-indigo-950 text-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Do money differently.
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Penvid has helped millions learn to spend, save, and live joyfully
              with a simple set of life-changing habits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg font-medium bg-white text-blue-900 hover:bg-gray-100"
                >
                  Start Your Free Trial
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-lg font-medium border-white text-white hover:bg-white/10"
                >
                  Log In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Manage your money with confidence
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our powerful tools help you track spending, save for goals, and
              build wealth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                title: 'Track Spending',
                description:
                  'See where your money goes with easy-to-read charts and insights.',
                icon: '📊',
              },
              {
                title: 'Set Goals',
                description:
                  'Save for what matters with automated goals and progress tracking.',
                icon: '🎯',
              },
              {
                title: 'Build Wealth',
                description:
                  'Grow your investments with personalized recommendations.',
                icon: '📈',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Ready to take control of your finances?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Join thousands of people who've changed their financial future with
            Penvid.
          </p>
          <Link href="/register">
            <Button size="lg" className="px-8 py-6 text-lg font-medium">
              Start Your Free Trial Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
