'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LoanService } from '@/services/LoanService'
import { LoanType } from '@/components/features/wealth-optimizer/types'
import LoanList from '@/components/features/loans/LoanList'
import LoanImportExport from '@/components/features/loans/LoanImportExport'
import EmptyLoansState from '@/components/features/loans/EmptyLoansState'
import { Icons } from '@/components/ui/icons'
import toast from 'react-hot-toast'
import { Loan } from '@/components/features/wealth-optimizer/types'
import { PlusIcon } from 'lucide-react'

export default function LoansPage() {
  const { user, isAuthenticated, loading } = useAuth()
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all-loans')
  const [isSaving, setIsSaving] = useState(false)

  // Load user's loans from Supabase
  useEffect(() => {
    const loadUserLoans = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Fetch user's loans
        const userLoans = await LoanService.getUserLoans(user.id)
        setLoans(userLoans.length > 0 ? userLoans : [])
      } catch (error) {
        console.error('Error loading loans:', error)
        toast.error('Failed to load your loan data')
        setLoans([])
      } finally {
        setIsLoading(false)
      }
    }

    loadUserLoans()
  }, [user, isAuthenticated])

  // Add a new loan
  const handleAddLoan = async () => {
    if (!isAuthenticated || !user) return

    const newId =
      loans.length > 0 ? Math.max(...loans.map((loan) => loan.id)) + 1 : 1
    const newLoan: Loan = {
      id: newId,
      name: `New Loan ${newId}`,
      balance: 0,
      interestRate: 0,
      termYears: 10,
      minimumPayment: 0,
      loanType: LoanType.PERSONAL,
    }

    try {
      setIsSaving(true)
      // First update state for immediate feedback
      setLoans([...loans, newLoan])

      // Then save to database
      await LoanService.saveUserLoans(user.id, [...loans, newLoan])
      toast.success('New loan added')
    } catch (error) {
      console.error('Error adding loan:', error)
      toast.error('Failed to add loan')
      // Rollback state on error
      setLoans(loans)
    } finally {
      setIsSaving(false)
    }
  }

  // Update a loan
  const handleUpdateLoan = async (updatedLoan: Loan) => {
    if (!isAuthenticated || !user) return

    try {
      setIsSaving(true)
      // First update state for immediate feedback
      const updatedLoans = loans.map((loan) =>
        loan.id === updatedLoan.id ? updatedLoan : loan
      )
      setLoans(updatedLoans)

      // Then save to database
      await LoanService.saveUserLoans(user.id, updatedLoans)
      toast.success('Loan updated')
    } catch (error) {
      console.error('Error updating loan:', error)
      toast.error('Failed to update loan')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete a loan
  const handleDeleteLoan = async (loanId: number) => {
    if (!isAuthenticated || !user) return

    try {
      setIsSaving(true)
      // First update state for immediate feedback
      const remainingLoans = loans.filter((loan) => loan.id !== loanId)
      setLoans(remainingLoans)

      // Then save to database
      await LoanService.saveUserLoans(user.id, remainingLoans)
      toast.success('Loan deleted')
    } catch (error) {
      console.error('Error deleting loan:', error)
      toast.error('Failed to delete loan')
    } finally {
      setIsSaving(false)
    }
  }

  // Get loans for the current tab
  const getFilteredLoans = () => {
    if (activeTab === 'all-loans') {
      return loans
    }

    const loanType = activeTab as LoanType
    return loans.filter((loan) => loan.loanType === loanType)
  }

  // Handle import of loans
  const handleImportLoans = async (importedLoans: Loan[]) => {
    if (!isAuthenticated || !user) return

    try {
      setIsSaving(true)

      // Assign new IDs to imported loans to avoid conflicts
      const maxId =
        loans.length > 0 ? Math.max(...loans.map((loan) => loan.id)) : 0
      const loansWithNewIds = importedLoans.map((loan, index) => ({
        ...loan,
        id: maxId + index + 1,
      }))

      // Merge with existing loans
      const mergedLoans = [...loans, ...loansWithNewIds]

      // Update state and save to database
      setLoans(mergedLoans)
      await LoanService.saveUserLoans(user.id, mergedLoans)
      toast.success(`${importedLoans.length} loans imported successfully`)
    } catch (error) {
      console.error('Error importing loans:', error)
      toast.error('Failed to import loans')
    } finally {
      setIsSaving(false)
    }
  }

  // Show loading state
  if (loading || isLoading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icons.spinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your loans...</p>
        </div>
      </div>
    )
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8 max-w-3xl">
        <div className="text-center p-12 border rounded-lg bg-white shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Manage Your Loans</h2>
          <p className="mb-6 text-gray-600">
            You need to be logged in to manage your loans.
          </p>
          <Button
            onClick={() => (window.location.href = '/login?redirect=/loans')}
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manage Your Loans</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            View, add, and manage all your loans in one place
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddLoan}
            className="flex items-center"
            disabled={isSaving}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Loan
          </Button>
          <LoanImportExport
            loans={loans}
            onImport={handleImportLoans}
            disabled={isSaving}
          />
        </div>
      </div>

      <Tabs
        defaultValue="all-loans"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="all-loans">All Loans</TabsTrigger>
          <TabsTrigger value={LoanType.MORTGAGE}>Mortgage</TabsTrigger>
          <TabsTrigger value={LoanType.STUDENT}>Student</TabsTrigger>
          <TabsTrigger value={LoanType.AUTO}>Auto</TabsTrigger>
          <TabsTrigger value={LoanType.CREDIT_CARD}>Credit Card</TabsTrigger>
          <TabsTrigger value={LoanType.PERSONAL}>Personal</TabsTrigger>
          <TabsTrigger value={LoanType.OTHER}>Other</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loans.length === 0 ? (
            <EmptyLoansState onAddLoan={handleAddLoan} />
          ) : (
            <LoanList
              loans={getFilteredLoans()}
              onUpdateLoan={handleUpdateLoan}
              onDeleteLoan={handleDeleteLoan}
              isLoading={isSaving}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
