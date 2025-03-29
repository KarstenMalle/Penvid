'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'
import { AnimatedContainer } from '@/components/ui/animated-container'

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
  const router = useRouter()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    // Redirect if not authenticated once loading is complete
    if (!loading && !isAuthenticated) {
      router.push('/login')
      return
    }

    // Fetch user data from Supabase
    const fetchUserData = async () => {
      if (isAuthenticated && user) {
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
          } else {
            setAccounts(accountsData || [])

            // If no accounts yet, create sample accounts for demo
            if (!accountsData || accountsData.length === 0) {
              await createSampleAccounts(user.id)
            }
          }

          // Fetch recent transactions
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

            // If no goals yet, create sample goals for demo
            if (!goalsData || goalsData.length === 0) {
              await createSampleGoals(user.id)
            }
          }

          // Refetch after creating samples
          if (
            !accountsData ||
            accountsData.length === 0 ||
            !goalsData ||
            goalsData.length === 0
          ) {
            fetchUserData()
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        } finally {
          setDataLoading(false)
        }
      }
    }

    if (isAuthenticated && user) {
      fetchUserData()
    }
  }, [isAuthenticated, router, loading, user])

  const createSampleAccounts = async (userId: string) => {
    try {
      // Insert sample checking account
      await supabase.from('accounts').insert([
        {
          user_id: userId,
          name: 'Checking',
          type: 'checking',
          balance: 2547.63,
          is_primary: true,
        },
      ])

      // Insert sample savings account
      await supabase.from('accounts').insert([
        {
          user_id: userId,
          name: 'Savings',
          type: 'savings',
          balance: 8925.42,
          is_primary: false,
        },
      ])

      // Insert sample investment account
      await supabase.from('accounts').insert([
        {
          user_id: userId,
          name: 'Investments',
          type: 'investment',
          balance: 21340.88,
          is_primary: false,
        },
      ])

      // Insert sample transactions
      const checkingAccount = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'checking')
        .single()

      if (checkingAccount.data) {
        await supabase.from('transactions').insert([
          {
            account_id: checkingAccount.data.id,
            user_id: userId,
            amount: -82.45,
            description: 'Grocery Store',
            category: 'Food',
            transaction_date: new Date().toISOString(),
          },
          {
            account_id: checkingAccount.data.id,
            user_id: userId,
            amount: 1250.0,
            description: 'Direct Deposit',
            category: 'Income',
            transaction_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          },
          {
            account_id: checkingAccount.data.id,
            user_id: userId,
            amount: -94.72,
            description: 'Electric Bill',
            category: 'Utilities',
            transaction_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          },
        ])
      }
    } catch (error) {
      console.error('Error creating sample accounts:', error)
    }
  }

  const createSampleGoals = async (userId: string) => {
    try {
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
    } catch (error) {
      console.error('Error creating sample goals:', error)
    }
  }

  // Show a loading state when checking authentication
  if (loading || dataLoading) {
    return (
      <div className="container mx-auto p-8">
        <DashboardSkeleton />
      </div>
    )
  }

  // Prevent rendering until authentication is verified
  if (!isAuthenticated) return null

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

      <AnimatedContainer delay={0.1}>
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

      <AnimatedContainer delay={0.1}>
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
