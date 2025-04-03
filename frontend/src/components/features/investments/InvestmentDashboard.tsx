// frontend/src/components/features/investments/InvestmentDashboard.tsx

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  InvestmentPortfolio as PortfolioType,
  InvestmentService,
  InvestmentSummary,
} from '@/services/InvestmentService'
import InvestmentPortfolio from './InvestmentPortfolio'
import { Icons } from '@/components/ui/icons'
import {
  PlusIcon,
  LayoutDashboard,
  DollarSign,
  PieChart,
  TrendingUp,
} from 'lucide-react'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import toast from 'react-hot-toast'

const InvestmentDashboard: React.FC = () => {
  const { user } = useAuth()
  const { t, currency } = useLocalization()
  const [portfolios, setPortfolios] = useState<PortfolioType[]>([])
  const [summary, setSummary] = useState<InvestmentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false)
  const [newPortfolio, setNewPortfolio] = useState<Partial<PortfolioType>>({
    name: '',
    description: '',
  })

  // Load portfolios and summary
  const loadData = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Load portfolios
      const portfolioData = await InvestmentService.getUserPortfolios(user.id)
      setPortfolios(portfolioData)

      // Load summary
      const summaryData = await InvestmentService.getUserInvestmentSummary(
        user.id
      )
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading investment data:', error)
      toast.error('Failed to load investment data')
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [user])

  // Handle creating a new portfolio
  const handleCreatePortfolio = async () => {
    if (!user) return

    try {
      const result = await InvestmentService.createPortfolio(
        user.id,
        newPortfolio
      )
      if (result) {
        setPortfolios([...portfolios, result])
        setShowCreatePortfolio(false)
        setNewPortfolio({
          name: '',
          description: '',
        })
        toast.success('Portfolio created successfully')
        loadData() // Refresh data
      }
    } catch (error) {
      console.error('Error creating portfolio:', error)
      toast.error('Failed to create portfolio')
    }
  }

  // Function to get investment type distribution for chart
  const getInvestmentTypeData = () => {
    if (!summary || !summary.investment_types) {
      return []
    }

    return Object.entries(summary.investment_types).map(
      ([type, percentage]) => ({
        name: type,
        value: percentage,
      })
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/20">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-lg">Total Value</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyFormatter value={summary?.current_value || 0} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {summary?.investment_count || 0} investments across{' '}
              {summary?.portfolio_count || 0} portfolios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <div className="rounded-full p-2 bg-green-100 dark:bg-green-900/20">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg">Total Gain/Loss</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(summary?.total_gain_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              <CurrencyFormatter value={summary?.total_gain_loss || 0} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {(summary?.total_gain_loss_percentage || 0) >= 0 ? '+' : ''}
              {(summary?.total_gain_loss_percentage || 0).toFixed(2)}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <div className="rounded-full p-2 bg-purple-100 dark:bg-purple-900/20">
                <LayoutDashboard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-lg">Portfolios</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.portfolio_count || 0}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Diversified investment portfolios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <div className="rounded-full p-2 bg-orange-100 dark:bg-orange-900/20">
                <PieChart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-lg">Allocation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-sm">
              {summary?.investment_types &&
              Object.entries(summary.investment_types).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(summary.investment_types)
                    .sort(([, a], [, b]) => b - a) // Sort by percentage (descending)
                    .slice(0, 3) // Take top 3
                    .map(([type, percentage]) => (
                      <div
                        key={type}
                        className="flex justify-between items-center"
                      >
                        <span>{type}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">No investments yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolios */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Portfolios</h2>
          <Button onClick={() => setShowCreatePortfolio(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            New Portfolio
          </Button>
        </div>

        {portfolios.length > 0 ? (
          portfolios.map((portfolio) => (
            <InvestmentPortfolio
              key={portfolio.id}
              portfolio={portfolio}
              onRefresh={loadData}
            />
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-4 mb-4">
                <LayoutDashboard className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Portfolios Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                Create your first investment portfolio to start tracking your
                investments and monitor your financial growth.
              </p>
              <Button onClick={() => setShowCreatePortfolio(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Portfolio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Portfolio Dialog */}
      <Dialog open={showCreatePortfolio} onOpenChange={setShowCreatePortfolio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Investment Portfolio</DialogTitle>
            <DialogDescription>
              Create a new portfolio to organize and track your investments.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="portfolio_name" className="text-right">
                Name
              </Label>
              <Input
                id="portfolio_name"
                value={newPortfolio.name}
                onChange={(e) =>
                  setNewPortfolio({ ...newPortfolio, name: e.target.value })
                }
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="portfolio_description" className="text-right">
                Description
              </Label>
              <Input
                id="portfolio_description"
                value={newPortfolio.description}
                onChange={(e) =>
                  setNewPortfolio({
                    ...newPortfolio,
                    description: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="goal_amount" className="text-right">
                Goal Amount
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  {currency === 'USD'
                    ? '$'
                    : currency === 'DKK'
                      ? 'kr'
                      : currency}
                </span>
                <Input
                  id="goal_amount"
                  type="number"
                  min="0"
                  step="100"
                  value={newPortfolio.goal_amount || ''}
                  onChange={(e) =>
                    setNewPortfolio({
                      ...newPortfolio,
                      goal_amount: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  className="pl-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target_date" className="text-right">
                Target Date
              </Label>
              <Input
                id="target_date"
                type="date"
                value={newPortfolio.target_date || ''}
                onChange={(e) =>
                  setNewPortfolio({
                    ...newPortfolio,
                    target_date: e.target.value || undefined,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreatePortfolio(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePortfolio}>Create Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InvestmentDashboard
