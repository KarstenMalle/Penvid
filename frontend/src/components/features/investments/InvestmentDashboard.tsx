import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLocalization } from '@/context/LocalizationContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Icons } from '@/components/ui/icons'
import {
  InvestmentService,
  InvestmentPortfolio,
  Investment,
  InvestmentType,
  InvestmentSummary,
} from '@/services/InvestmentService'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { Pie, Doughnut } from 'react-chartjs-2'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

// Define chart colors
const chartColors = [
  'rgba(54, 162, 235, 0.8)',
  'rgba(255, 99, 132, 0.8)',
  'rgba(255, 205, 86, 0.8)',
  'rgba(75, 192, 192, 0.8)',
  'rgba(153, 102, 255, 0.8)',
  'rgba(255, 159, 64, 0.8)',
  'rgba(201, 203, 207, 0.8)',
  'rgba(94, 232, 129, 0.8)',
]

export default function InvestmentDashboard() {
  const { user, isAuthenticated } = useAuth()
  const { formatCurrency } = useLocalization()

  // State
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(
    null
  )
  const [investmentSummary, setInvestmentSummary] =
    useState<InvestmentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingInvestment, setIsAddingInvestment] = useState(false)
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false)
  const [newInvestment, setNewInvestment] = useState<Partial<Investment>>({
    name: '',
    type: InvestmentType.STOCK,
    symbol: '',
    amount: 0,
    purchase_price: 0,
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [newPortfolio, setNewPortfolio] = useState<
    Partial<InvestmentPortfolio>
  >({
    name: '',
    description: '',
  })

  // Load user's investment data
  useEffect(() => {
    const loadInvestmentData = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Fetch user's portfolios
        const userPortfolios = await InvestmentService.getUserPortfolios(
          user.id
        )
        setPortfolios(userPortfolios)

        // Fetch investment summary
        const summary = await InvestmentService.getUserInvestmentSummary(
          user.id
        )
        setInvestmentSummary(summary)

        // If portfolios exist, select the first one and fetch its investments
        if (userPortfolios.length > 0) {
          setSelectedPortfolio(userPortfolios[0].id)
          const portfolioInvestments =
            await InvestmentService.getPortfolioInvestments(
              user.id,
              userPortfolios[0].id
            )
          setInvestments(portfolioInvestments)
        }
      } catch (error) {
        console.error('Error loading investment data:', error)
        toast.error('Failed to load investment data')
      } finally {
        setIsLoading(false)
      }
    }

    loadInvestmentData()
  }, [user, isAuthenticated])

  // Handle portfolio selection change
  const handlePortfolioChange = async (portfolioId: string) => {
    if (!user) return

    setSelectedPortfolio(portfolioId)
    setIsLoading(true)

    try {
      const portfolioInvestments =
        await InvestmentService.getPortfolioInvestments(user.id, portfolioId)
      setInvestments(portfolioInvestments)
    } catch (error) {
      console.error('Error loading portfolio investments:', error)
      toast.error('Failed to load portfolio investments')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle adding a new portfolio
  const handleAddPortfolio = async () => {
    if (!user || !newPortfolio.name) return

    setIsLoading(true)
    try {
      const createdPortfolio = await InvestmentService.createPortfolio(
        user.id,
        newPortfolio
      )

      if (createdPortfolio) {
        setPortfolios([...portfolios, createdPortfolio])
        setSelectedPortfolio(createdPortfolio.id)
        setInvestments([]) // Clear investments since new portfolio is empty
        setIsAddingPortfolio(false)
        setNewPortfolio({ name: '', description: '' })
        toast.success('Portfolio created successfully')
      }
    } catch (error) {
      console.error('Error creating portfolio:', error)
      toast.error('Failed to create portfolio')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle adding a new investment
  const handleAddInvestment = async () => {
    if (!user || !selectedPortfolio || !newInvestment.name) return

    setIsLoading(true)
    try {
      const investment = {
        ...newInvestment,
        portfolio_id: selectedPortfolio,
      }

      const createdInvestment = await InvestmentService.addInvestment(
        user.id,
        selectedPortfolio,
        investment
      )

      if (createdInvestment) {
        setInvestments([...investments, createdInvestment])
        setIsAddingInvestment(false)
        setNewInvestment({
          name: '',
          type: InvestmentType.STOCK,
          symbol: '',
          amount: 0,
          purchase_price: 0,
          purchase_date: format(new Date(), 'yyyy-MM-dd'),
        })

        // Refresh the investment summary
        const updatedSummary = await InvestmentService.getUserInvestmentSummary(
          user.id
        )
        setInvestmentSummary(updatedSummary)

        toast.success('Investment added successfully')
      }
    } catch (error) {
      console.error('Error adding investment:', error)
      toast.error('Failed to add investment')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle investment input changes
  const handleInvestmentChange = (field: string, value: any) => {
    setNewInvestment({
      ...newInvestment,
      [field]: value,
    })
  }

  // Calculate total portfolio value
  const totalPortfolioValue = investments.reduce((total, investment) => {
    return (
      total +
      investment.amount *
        (investment.current_price || investment.purchase_price)
    )
  }, 0)

  // Prepare chart data for investment types
  const investmentTypeChartData = {
    labels: Object.keys(investmentSummary?.investment_types || {}),
    datasets: [
      {
        data: Object.values(investmentSummary?.investment_types || {}),
        backgroundColor: chartColors,
        borderWidth: 1,
      },
    ],
  }

  // Prepare chart data for portfolio allocation
  const portfolioAllocationChartData = {
    labels: investments.map((inv) => inv.name),
    datasets: [
      {
        data: investments.map(
          (inv) => inv.amount * (inv.current_price || inv.purchase_price)
        ),
        backgroundColor: chartColors,
        borderWidth: 1,
      },
    ],
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading investment data...</span>
      </div>
    )
  }

  // Show empty state if no portfolios
  if (portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-4 mb-4">
          <Icons.dollar className="h-10 w-10 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold mb-2">No Investment Portfolios</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          Start tracking your investments by creating your first portfolio.
        </p>
        <Button onClick={() => setIsAddingPortfolio(true)}>
          Create Portfolio
        </Button>

        {/* Portfolio Creation Dialog */}
        <Dialog open={isAddingPortfolio} onOpenChange={setIsAddingPortfolio}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Create a new portfolio to organize your investments.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="portfolio-name">Portfolio Name</Label>
                <Input
                  id="portfolio-name"
                  placeholder="e.g., Retirement, Growth Stocks"
                  value={newPortfolio.name}
                  onChange={(e) =>
                    handlePortfolioChange('name', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio-description">
                  Description (Optional)
                </Label>
                <Input
                  id="portfolio-description"
                  placeholder="Brief description of this portfolio"
                  value={newPortfolio.description}
                  onChange={(e) =>
                    handlePortfolioChange('description', e.target.value)
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddingPortfolio(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPortfolio}
                disabled={!newPortfolio.name}
              >
                Create Portfolio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Portfolio Creation Dialog */}
        <Dialog open={isAddingPortfolio} onOpenChange={setIsAddingPortfolio}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Create a new portfolio to organize your investments.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="portfolio-name">Portfolio Name</Label>
                <Input
                  id="portfolio-name"
                  placeholder="e.g., Retirement, Growth Stocks"
                  value={newPortfolio.name}
                  onChange={(e) =>
                    handlePortfolioChange('name', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio-description">
                  Description (Optional)
                </Label>
                <Input
                  id="portfolio-description"
                  placeholder="Brief description of this portfolio"
                  value={newPortfolio.description}
                  onChange={(e) =>
                    handlePortfolioChange('description', e.target.value)
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddingPortfolio(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPortfolio}
                disabled={!newPortfolio.name}
              >
                Create Portfolio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
}
