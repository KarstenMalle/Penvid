'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton'
import { AnimatedContainer } from '@/components/ui/animated-container'
import { Icons } from '@/components/ui/icons'
import apiService from '@/lib/api-client'
import toast from 'react-hot-toast'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  is_primary: boolean
}

interface Transaction {
  id: string
  account_id: string
  amount: number
  description: string
  category: string
  transaction_date: string
}

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  is_completed: boolean
}

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const router = useRouter()

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem('auth_token')
      const authStatus = localStorage.getItem('auth')
      const userId = localStorage.getItem('user_id')
      const userEmail = localStorage.getItem('user_email')

      if (!authToken || authStatus !== 'true') {
        setIsAuthenticated(false)
        setRedirecting(true)
        router.push('/login')
        return
      }

      setUser({ id: userId, email: userEmail })
      setIsAuthenticated(true)
    }

    checkAuth()
  }, [router])

  // Fetch user data when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || redirecting) {
      return
    }

    const fetchUserData = async () => {
      setDataLoading(true)

      try {
        // Fetch accounts from our backend API
        const accountsData = await apiService.getAccounts()
        setAccounts(accountsData)

        // If no accounts, create sample data
        if (!accountsData || accountsData.length === 0) {
          toast.info('Creating sample financial data for your account...')
          await apiService.createSampleData()
          // Fetch accounts again after sample data creation
          const refreshedAccounts = await apiService.getAccounts()
          setAccounts(refreshedAccounts)
        }

        // Fetch transactions
        const transactionsData = await apiService.getTransactions()
        setTransactions(transactionsData)

        // Fetch goals
        const goalsData = await apiService.getGoals()
        setGoals(goalsData)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast.error('Error loading financial data')
      } finally {
        setDataLoading(false)
      }
    }

    fetchUserData()
  }, [isAuthenticated, user, redirecting])

  // Show loading states
  if (isAuthenticated === null || redirecting) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">
            {redirecting ? 'Redirecting to login...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show dashboard skeleton while fetching data
  if (dataLoading) {
    return (
      <div className="container mx-auto p-8">
        <DashboardSkeleton />
      </div>
    )
  }

  // Show unauthorized message if needed
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="mb-6">You must be logged in to view this page.</p>
        <Button onClick={() => router.push('/login')}>Go to Login</Button>
      </div>
    )
  }

  return (
    <main className="container mx-auto p-8">
      <AnimatedContainer>
        <h1 className="text-3xl font-bold mb-8">Welcome to Your Dashboard</h1>
      </AnimatedContainer>

      <AnimatedContainer delay={0.1}>
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Account Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                  <CardDescription>
                    {account.is_primary
                      ? 'Primary Account'
                      : account.type.charAt(0).toUpperCase() +
                        account.type.slice(1)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    $
                    {account.balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Available Balance
                  </p>
                </CardContent>
              </Card>
            ))}

            {accounts.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>You don't have any accounts yet.</p>
                  <Button className="mt-4">Add Account</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </AnimatedContainer>

      <AnimatedContainer delay={0.2}>
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Recent Transactions</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Description</th>
                      <th className="text-left p-4">Category</th>
                      <th className="text-right p-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="p-4">
                          {new Date(
                            transaction.transaction_date
                          ).toLocaleDateString()}
                        </td>
                        <td className="p-4">{transaction.description}</td>
                        <td className="p-4">{transaction.category}</td>
                        <td
                          className={`text-right p-4 ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {transaction.amount < 0 ? '-' : '+'}$
                          {Math.abs(transaction.amount).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </td>
                      </tr>
                    ))}

                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center">
                          No transactions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </AnimatedContainer>

      <AnimatedContainer delay={0.3}>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Financial Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => {
              const progressPercentage = Math.round(
                (goal.current_amount / goal.target_amount) * 100
              )

              return (
                <Card key={goal.id}>
                  <CardHeader>
                    <CardTitle>{goal.name}</CardTitle>
                    <CardDescription>
                      {goal.target_date
                        ? `Target: $${goal.target_amount.toLocaleString()} by ${new Date(goal.target_date).toLocaleDateString()}`
                        : `Target: $${goal.target_amount.toLocaleString()}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Progress</span>
                        <span className="font-medium">
                          {progressPercentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${goal.current_amount.toLocaleString()} saved of $
                        {goal.target_amount.toLocaleString()} goal
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {goals.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>You don't have any financial goals yet.</p>
                  <Button className="mt-4">Create Goal</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </AnimatedContainer>
    </main>
  )
}
