'use client'

import { useEffect, useState } from 'react'
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
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton'
import { AnimatedContainer } from '@/components/ui/animated-container'
import { Icons } from '@/components/ui/icons'
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
  const { isAuthenticated, loading, user } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const supabase = createClient()

  // Check authentication status
  useEffect(() => {
    if (!loading && !isAuthenticated && !redirecting) {
      setRedirecting(true)
      window.location.replace('/login')
    }
  }, [isAuthenticated, loading, redirecting])

  // Fetch user data when authenticated
  useEffect(() => {
    if (loading || !isAuthenticated || !user || redirecting) {
      return
    }

    const fetchUserData = async () => {
      setDataLoading(true)

      try {
        // Fetch accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })

        if (accountsError) {
          console.error('Error fetching accounts:', accountsError)
          if (!accountsError.message.includes('Failed to fetch')) {
            toast.error('Error loading account data')
          }
        } else {
          setAccounts(accountsData || [])

          // Create sample accounts if none exist
          if (!accountsData || accountsData.length === 0) {
            await createSampleData(user.id)
          }
        }

        // Fetch transactions
        const { data: transactionsData, error: transactionsError } =
          await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .limit(5)

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError)
        } else {
          setTransactions(transactionsData || [])
        }

        // Fetch goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (goalsError) {
          console.error('Error fetching goals:', goalsError)
        } else {
          setGoals(goalsData || [])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchUserData()
  }, [isAuthenticated, loading, user, redirecting])

  // Helper function to create sample data for new users
  const createSampleData = async (userId: string) => {
    try {
      // Create checking account
      const { data: checkingAccount, error: checkingError } = await supabase
        .from('accounts')
        .insert([
          {
            user_id: userId,
            name: 'Checking',
            type: 'checking',
            balance: 2547.63,
            is_primary: true,
          },
        ])
        .select()
        .single()

      if (checkingError) throw checkingError

      // Create savings account
      await supabase.from('accounts').insert([
        {
          user_id: userId,
          name: 'Savings',
          type: 'savings',
          balance: 8925.42,
          is_primary: false,
        },
      ])

      // Create investment account
      await supabase.from('accounts').insert([
        {
          user_id: userId,
          name: 'Investments',
          type: 'investment',
          balance: 21340.88,
          is_primary: false,
        },
      ])

      // Create sample transactions for checking account
      if (checkingAccount) {
        await supabase.from('transactions').insert([
          {
            account_id: checkingAccount.id,
            user_id: userId,
            amount: -82.45,
            description: 'Grocery Store',
            category: 'Food',
            transaction_date: new Date().toISOString(),
          },
          {
            account_id: checkingAccount.id,
            user_id: userId,
            amount: 1250.0,
            description: 'Direct Deposit',
            category: 'Income',
            transaction_date: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            account_id: checkingAccount.id,
            user_id: userId,
            amount: -94.72,
            description: 'Electric Bill',
            category: 'Utilities',
            transaction_date: new Date(Date.now() - 172800000).toISOString(),
          },
        ])
      }

      // Create sample goals
      await supabase.from('goals').insert([
        {
          user_id: userId,
          name: 'Vacation Fund',
          target_amount: 2500,
          current_amount: 1625,
          target_date: new Date('2025-06-30').toISOString(),
          is_completed: false,
        },
        {
          user_id: userId,
          name: 'Emergency Fund',
          target_amount: 10000,
          current_amount: 4000,
          target_date: null,
          is_completed: false,
        },
      ])

      // Fetch accounts again after creation
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })

      setAccounts(data || [])

      // Refresh page to show all new data
      window.location.reload()
    } catch (error) {
      console.error('Error creating sample data:', error)
      toast.error('Error setting up your account')
    }
  }

  // Show loading states
  if (loading || redirecting) {
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
        <Button onClick={() => (window.location.href = '/login')}>
          Go to Login
        </Button>
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
                      <div className="h-2 bg-gray-200 rounded-full">
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
