// frontend/src/components/features/investments/InvestmentPortfolio.tsx

import React, { useState, useEffect } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  InvestmentPortfolio as PortfolioType,
  Investment,
  InvestmentService,
  InvestmentType,
} from '@/services/InvestmentService'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { useLocalization } from '@/context/LocalizationContext'
import { useAuth } from '@/context/AuthContext'
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Briefcase,
  TrendingUp,
  Target,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import toast from 'react-hot-toast'

interface InvestmentPortfolioProps {
  portfolio: PortfolioType
  onRefresh: () => void
}

const InvestmentPortfolio: React.FC<InvestmentPortfolioProps> = ({
  portfolio,
  onRefresh,
}) => {
  const { t, currency } = useLocalization()
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddInvestment, setShowAddInvestment] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [totalValue, setTotalValue] = useState(0)
  const [totalGainLoss, setTotalGainLoss] = useState(0)
  const [totalGainLossPercent, setTotalGainLossPercent] = useState(0)
  const [progressPercent, setProgressPercent] = useState(0)

  // New investment form state
  const [newInvestment, setNewInvestment] = useState<Partial<Investment>>({
    name: '',
    symbol: '',
    type: InvestmentType.STOCK,
    purchase_date: new Date().toISOString().split('T')[0],
    amount: 1,
    purchase_price: 0,
  })

  // Edit portfolio form state
  const [editedPortfolio, setEditedPortfolio] = useState<
    Partial<PortfolioType>
  >({
    name: portfolio.name,
    description: portfolio.description,
    goal_amount: portfolio.goal_amount,
    target_date: portfolio.target_date,
  })

  // Load investments for this portfolio
  useEffect(() => {
    const loadInvestments = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const investmentData = await InvestmentService.getPortfolioInvestments(
          user.id,
          portfolio.id
        )
        setInvestments(investmentData)

        // Calculate totals
        const invested = investmentData.reduce(
          (sum, inv) => sum + inv.purchase_price * inv.amount,
          0
        )
        const currentValue = investmentData.reduce(
          (sum, inv) =>
            sum + (inv.current_price || inv.purchase_price) * inv.amount,
          0
        )
        setTotalValue(currentValue)
        setTotalGainLoss(currentValue - invested)
        setTotalGainLossPercent(
          invested > 0 ? (currentValue / invested - 1) * 100 : 0
        )

        // Calculate progress toward goal
        if (portfolio.goal_amount && portfolio.goal_amount > 0) {
          setProgressPercent(
            Math.min(100, (currentValue / portfolio.goal_amount) * 100)
          )
        }
      } catch (error) {
        console.error('Error loading investments:', error)
        toast.error('Failed to load investment data')
      } finally {
        setIsLoading(false)
      }
    }

    loadInvestments()
  }, [user, portfolio])

  // Handle adding a new investment
  const handleAddInvestment = async () => {
    if (!user) return

    try {
      const result = await InvestmentService.addInvestment(
        user.id,
        portfolio.id,
        newInvestment
      )

      if (result) {
        setInvestments([...investments, result as Investment])
        setShowAddInvestment(false)
        setNewInvestment({
          name: '',
          symbol: '',
          type: InvestmentType.STOCK,
          purchase_date: new Date().toISOString().split('T')[0],
          amount: 1,
          purchase_price: 0,
        })
        toast.success('Investment added successfully')
        onRefresh() // Refresh parent
      }
    } catch (error) {
      console.error('Error adding investment:', error)
      toast.error('Failed to add investment')
    }
  }

  // Handle updating portfolio
  const handleUpdatePortfolio = async () => {
    if (!user) return

    try {
      // Update via Supabase directly since we don't have an API endpoint
      const supabase = await import('@/lib/supabase-browser').then((mod) =>
        mod.createClient()
      )

      const { error } = await supabase
        .from('investment_portfolios')
        .update({
          name: editedPortfolio.name,
          description: editedPortfolio.description,
          goal_amount: editedPortfolio.goal_amount,
          target_date: editedPortfolio.target_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', portfolio.id)
        .eq('user_id', user.id)

      if (error) throw error

      setShowEditPortfolio(false)
      toast.success('Portfolio updated successfully')
      onRefresh() // Refresh parent
    } catch (error) {
      console.error('Error updating portfolio:', error)
      toast.error('Failed to update portfolio')
    }
  }

  // Handle deleting portfolio
  const handleDeletePortfolio = async () => {
    if (!user) return

    try {
      // Delete via Supabase directly since we don't have an API endpoint
      const supabase = await import('@/lib/supabase-browser').then((mod) =>
        mod.createClient()
      )

      const { error } = await supabase
        .from('investment_portfolios')
        .delete()
        .eq('id', portfolio.id)
        .eq('user_id', user.id)

      if (error) throw error

      setShowDeleteConfirm(false)
      toast.success('Portfolio deleted successfully')
      onRefresh() // Refresh parent
    } catch (error) {
      console.error('Error deleting portfolio:', error)
      toast.error('Failed to delete portfolio')
    }
  }

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
    } catch (e) {
      return dateString
    }
  }

  // Handle deleting an investment
  const handleDeleteInvestment = async (investmentId: string) => {
    if (!user) return

    try {
      const success = await InvestmentService.deleteInvestment(
        user.id,
        investmentId
      )
      if (success) {
        setInvestments(investments.filter((inv) => inv.id !== investmentId))
        toast.success('Investment deleted successfully')
        onRefresh() // Refresh parent
      }
    } catch (error) {
      console.error('Error deleting investment:', error)
      toast.error('Failed to delete investment')
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/20 mr-2">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>{portfolio.name}</CardTitle>
              <CardDescription>{portfolio.description}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditPortfolio(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Portfolio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Portfolio Value</div>
            <div className="text-lg font-semibold">
              <CurrencyFormatter value={totalValue} />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Total Gain/Loss</div>
            <div
              className={`text-lg font-semibold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              <CurrencyFormatter value={totalGainLoss} />
              <span className="text-sm ml-1">
                ({totalGainLossPercent >= 0 ? '+' : ''}
                {totalGainLossPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          {portfolio.goal_amount ? (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Goal Progress</div>
              <div className="flex items-center">
                <div className="grow mr-2">
                  <Progress value={progressPercent} />
                </div>
                <div className="text-sm font-medium">
                  {progressPercent.toFixed(0)}%
                </div>
              </div>
              <div className="text-sm mt-1">
                <CurrencyFormatter value={totalValue} /> of{' '}
                <CurrencyFormatter value={portfolio.goal_amount} />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Investments</div>
              <div className="text-lg font-semibold">{investments.length}</div>
            </div>
          )}
          {portfolio.target_date ? (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Target Date</div>
              <div className="text-lg font-semibold">
                {formatDate(portfolio.target_date)}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Last Updated</div>
              <div className="text-lg font-semibold">
                {formatDate(portfolio.updated_at)}
              </div>
            </div>
          )}
        </div>

        {/* Investments Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.length > 0 ? (
                investments.map((investment) => {
                  const currentPrice =
                    investment.current_price || investment.purchase_price
                  const value = investment.amount * currentPrice
                  const change = currentPrice - investment.purchase_price
                  const changePercent =
                    (change / investment.purchase_price) * 100

                  return (
                    <TableRow key={investment.id}>
                      <TableCell className="font-medium">
                        {investment.name}
                      </TableCell>
                      <TableCell>{investment.symbol || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            investment.type === InvestmentType.STOCK
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                              : investment.type === InvestmentType.ETF
                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                                : investment.type === InvestmentType.BOND
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                  : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }
                        >
                          {investment.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {investment.amount}
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyFormatter value={currentPrice} />
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyFormatter value={value} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            changePercent >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {changePercent >= 0 ? '+' : ''}
                          {changePercent.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvestment(investment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    {isLoading ? (
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-500">No investments found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setShowAddInvestment(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Investment
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between py-4">
        <p className="text-sm text-gray-500">
          {investments.length}{' '}
          {investments.length === 1 ? 'investment' : 'investments'}
        </p>
        <Button size="sm" onClick={() => setShowAddInvestment(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Investment
        </Button>
      </CardFooter>

      {/* Add Investment Dialog */}
      <Dialog open={showAddInvestment} onOpenChange={setShowAddInvestment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Investment</DialogTitle>
            <DialogDescription>
              Add a new investment to your {portfolio.name} portfolio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newInvestment.name}
                onChange={(e) =>
                  setNewInvestment({ ...newInvestment, name: e.target.value })
                }
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                Symbol
              </Label>
              <Input
                id="symbol"
                value={newInvestment.symbol}
                onChange={(e) =>
                  setNewInvestment({ ...newInvestment, symbol: e.target.value })
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={newInvestment.type}
                onValueChange={(value) =>
                  setNewInvestment({
                    ...newInvestment,
                    type: value as InvestmentType,
                  })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select investment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={InvestmentType.STOCK}>Stock</SelectItem>
                  <SelectItem value={InvestmentType.ETF}>ETF</SelectItem>
                  <SelectItem value={InvestmentType.BOND}>Bond</SelectItem>
                  <SelectItem value={InvestmentType.CRYPTO}>
                    Cryptocurrency
                  </SelectItem>
                  <SelectItem value={InvestmentType.REAL_ESTATE}>
                    Real Estate
                  </SelectItem>
                  <SelectItem value={InvestmentType.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchase_date" className="text-right">
                Purchase Date
              </Label>
              <Input
                id="purchase_date"
                type="date"
                value={newInvestment.purchase_date}
                onChange={(e) =>
                  setNewInvestment({
                    ...newInvestment,
                    purchase_date: e.target.value,
                  })
                }
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount/Shares
              </Label>
              <Input
                id="amount"
                type="number"
                min="0.0001"
                step="0.0001"
                value={newInvestment.amount}
                onChange={(e) =>
                  setNewInvestment({
                    ...newInvestment,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchase_price" className="text-right">
                Purchase Price
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
                  id="purchase_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newInvestment.purchase_price}
                  onChange={(e) =>
                    setNewInvestment({
                      ...newInvestment,
                      purchase_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="pl-8"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddInvestment(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddInvestment}>Add Investment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Portfolio Dialog */}
      <Dialog open={showEditPortfolio} onOpenChange={setShowEditPortfolio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
            <DialogDescription>
              Update the details of your investment portfolio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="portfolio_name" className="text-right">
                Name
              </Label>
              <Input
                id="portfolio_name"
                value={editedPortfolio.name || ''}
                onChange={(e) =>
                  setEditedPortfolio({
                    ...editedPortfolio,
                    name: e.target.value,
                  })
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
                value={editedPortfolio.description || ''}
                onChange={(e) =>
                  setEditedPortfolio({
                    ...editedPortfolio,
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
                  value={editedPortfolio.goal_amount || ''}
                  onChange={(e) =>
                    setEditedPortfolio({
                      ...editedPortfolio,
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
                value={editedPortfolio.target_date || ''}
                onChange={(e) =>
                  setEditedPortfolio({
                    ...editedPortfolio,
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
              onClick={() => setShowEditPortfolio(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePortfolio}>Update Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{portfolio.name}" portfolio?
              This will also delete all investments in this portfolio.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePortfolio}>
              Delete Portfolio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default InvestmentPortfolio
