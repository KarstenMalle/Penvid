'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import InvestmentChart from '@/components/features/investments/InvestmentChart'
import { CurrencySwitch } from '@/components/ui/currency-switch'
import { UserSettings } from '@/services/FinancialApiService'
import { FinancialApiService } from '@/services/FinancialApiService'
import InvestmentDashboard from '@/components/features/investments/InvestmentDashboard'
import { Icons } from '@/components/ui/icons'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function InvestmentTrackerPage() {
  const { user, isAuthenticated, loading } = useAuth()
  const { t, currency } = useLocalization()

  // Input states for Calculator tab
  const [monthlyAmount, setMonthlyAmount] = useState(500)
  const [annualReturn, setAnnualReturn] = useState(7.0)
  const [yearsToInvest, setYearsToInvest] = useState(20)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [inflationRate, setInflationRate] = useState(2.5)
  const [riskFactor, setRiskFactor] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Update inputs based on user settings
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false)
      return
    }

    const loadUserSettings = async () => {
      try {
        const settings = await FinancialApiService.getUserSettings(user.id)
        setUserSettings(settings)
        setAnnualReturn(settings.expected_investment_return * 100)
        setInflationRate(settings.expected_inflation * 100)
        setRiskFactor(settings.risk_tolerance * 100)
      } catch (error) {
        console.error('Error loading user settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserSettings()
  }, [user, isAuthenticated])

  // Calculate months from years
  const months = yearsToInvest * 12

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // The chart will automatically update based on state changes
  }

  // Loading state
  if (loading || isLoading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading investment tracker...</p>
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
            <CardTitle>Investment Tracker</CardTitle>
            <CardDescription>
              Sign in to access this premium wealth-building tool
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center p-6">
            <p className="mb-6">
              You need to be logged in to access the Investment Tracker tool.
            </p>
            <Button
              className="mx-auto"
              onClick={() =>
                (window.location.href =
                  '/login?redirect=/wealth-tools/investment-tracker')
              }
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Investment Tracker</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Track, analyze, and optimize your investment portfolio
          </p>
        </div>
        <CurrencySwitch minimal />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <InvestmentDashboard />
        </TabsContent>

        <TabsContent value="calculator">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Investment Parameters</CardTitle>
                <CardDescription>
                  Adjust your investment details to see how different scenarios
                  affect your long-term results.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Monthly Contribution */}
                  <div className="space-y-2">
                    <Label htmlFor="monthlyAmount">Monthly Contribution</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                        {currency === 'USD'
                          ? '$'
                          : currency === 'DKK'
                            ? 'kr'
                            : currency}
                      </span>
                      <Input
                        id="monthlyAmount"
                        type="number"
                        value={monthlyAmount}
                        onChange={(e) =>
                          setMonthlyAmount(parseFloat(e.target.value) || 0)
                        }
                        className="pl-8"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Annual Return */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="annualReturn">Annual Return</Label>
                      <span>{annualReturn.toFixed(1)}%</span>
                    </div>
                    <Slider
                      id="annualReturn"
                      min={1}
                      max={15}
                      step={0.1}
                      value={[annualReturn]}
                      onValueChange={(values) => setAnnualReturn(values[0])}
                    />
                    <p className="text-sm text-gray-500">
                      Historical S&P 500 average: 10.06% (nominal) or 6.78%
                      (inflation-adjusted)
                    </p>
                  </div>

                  {/* Years to Invest */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="yearsToInvest">Time Horizon</Label>
                      <span>{yearsToInvest} years</span>
                    </div>
                    <Slider
                      id="yearsToInvest"
                      min={1}
                      max={40}
                      step={1}
                      value={[yearsToInvest]}
                      onValueChange={(values) => setYearsToInvest(values[0])}
                    />
                  </div>

                  {/* Advanced Options Toggle */}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full"
                    >
                      {showAdvanced
                        ? 'Hide Advanced Options'
                        : 'Show Advanced Options'}
                    </Button>
                  </div>

                  {/* Advanced Options */}
                  {showAdvanced && (
                    <div className="space-y-4 pt-4 border-t">
                      {/* Inflation Rate */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="inflationRate">Inflation Rate</Label>
                          <span>{inflationRate.toFixed(1)}%</span>
                        </div>
                        <Slider
                          id="inflationRate"
                          min={0}
                          max={10}
                          step={0.1}
                          value={[inflationRate]}
                          onValueChange={(values) =>
                            setInflationRate(values[0])
                          }
                        />
                        <p className="text-sm text-gray-500">
                          US average historical inflation: 3.28% (1913-2023)
                        </p>
                      </div>

                      {/* Risk Factor */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="riskFactor">Risk Adjustment</Label>
                          <span>{riskFactor.toFixed(0)}%</span>
                        </div>
                        <Slider
                          id="riskFactor"
                          min={0}
                          max={50}
                          step={1}
                          value={[riskFactor]}
                          onValueChange={(values) => setRiskFactor(values[0])}
                        />
                        <p className="text-sm text-gray-500">
                          Higher values apply a larger discount to account for
                          market volatility
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (userSettings) {
                      setAnnualReturn(
                        userSettings.expected_investment_return * 100
                      )
                      setInflationRate(userSettings.expected_inflation * 100)
                      setRiskFactor(userSettings.risk_tolerance * 100)
                      toast.success('Reset to your default settings')
                    }
                  }}
                >
                  Reset to My Default Settings
                </Button>
              </CardFooter>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Investment Projection</CardTitle>
                <CardDescription>
                  Visualization of your investment growth over {yearsToInvest}{' '}
                  years ({months} months)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvestmentChart
                  monthlyAmount={monthlyAmount}
                  annualReturn={annualReturn}
                  months={months}
                  inflationRate={inflationRate / 100}
                  riskFactor={riskFactor / 100}
                />

                {/* Key Investment Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Contributions
                    </p>
                    <p className="text-xl font-bold">
                      {(monthlyAmount * months).toLocaleString()} {currency}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Time Period
                    </p>
                    <p className="text-xl font-bold">
                      {yearsToInvest} years ({months} months)
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Expected Return
                    </p>
                    <p className="text-xl font-bold">
                      {annualReturn.toFixed(2)}% annually
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Investment Insights</CardTitle>
              <CardDescription>
                Data-driven insights to help optimize your investment strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Coming Soon Message */}
                <div className="text-center py-12">
                  <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-4 inline-flex mb-4">
                    <Icons.lineChart className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    Investment Insights Coming Soon
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto mb-6">
                    We're working on advanced analytics and insights to help you
                    understand your investment performance and make better
                    decisions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('dashboard')}
                    >
                      Go to Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('calculator')}
                    >
                      Use Calculator
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-center">
        <Link href="/wealth-tools">
          <Button variant="outline">Back to Wealth Tools</Button>
        </Link>
      </div>
    </div>
  )
}
