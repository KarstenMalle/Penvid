import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loan, LoanType } from '@/components/features/wealth-optimizer/types'
import Link from 'next/link'
import { Edit, Trash2, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  formatCurrency,
  formatPercent,
} from '@/components/features/wealth-optimizer/calculations'
import { Badge } from '@/components/ui/badge'
import LoanEditDialog from './LoanEditDialog'

interface LoanListProps {
  loans: Loan[]
  onUpdateLoan: (loan: Loan) => void
  onDeleteLoan: (loanId: number) => void
  isLoading?: boolean
}

// Map loan types to more user-friendly labels and colors
const LOAN_TYPE_CONFIG: Record<LoanType, { label: string; color: string }> = {
  [LoanType.MORTGAGE]: {
    label: 'Mortgage',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  },
  [LoanType.STUDENT]: {
    label: 'Student',
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  },
  [LoanType.AUTO]: {
    label: 'Auto',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  },
  [LoanType.CREDIT_CARD]: {
    label: 'Credit Card',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  },
  [LoanType.PERSONAL]: {
    label: 'Personal',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  },
  [LoanType.OTHER]: {
    label: 'Other',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  },
}

const LoanList: React.FC<LoanListProps> = ({
  loans,
  onUpdateLoan,
  onDeleteLoan,
  isLoading = false,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Loan
    direction: 'ascending' | 'descending'
  }>({ key: 'id', direction: 'ascending' })

  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [deleteConfirmLoan, setDeleteConfirmLoan] = useState<Loan | null>(null)

  // Handle sort request
  const requestSort = (key: keyof Loan) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  // Get sorted loans
  const getSortedLoans = () => {
    const sortableLoans = [...loans]
    if (sortConfig.key) {
      sortableLoans.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return sortableLoans
  }

  // Calculate total balance
  const totalBalance = loans.reduce((sum, loan) => sum + loan.balance, 0)

  // Open edit dialog
  const handleEdit = (loan: Loan) => {
    setEditingLoan({ ...loan }) // Make a copy of the loan to avoid reference issues
  }

  // Confirm deletion
  const confirmDelete = (loan: Loan) => {
    setDeleteConfirmLoan(loan)
  }

  // Execute delete
  const executeDelete = () => {
    if (deleteConfirmLoan) {
      onDeleteLoan(deleteConfirmLoan.id)
      setDeleteConfirmLoan(null)
    }
  }

  // Check if the list is empty
  if (loans.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">
          No loans found in this category. Add a loan to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle>Your Loans</CardTitle>
          <CardDescription>
            {loans.length} {loans.length === 1 ? 'loan' : 'loans'} with a total
            balance of {formatCurrency(totalBalance)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort('name')}
                  >
                    Name
                    {sortConfig.key === 'name' && (
                      <span>
                        {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort('balance')}
                  >
                    Balance
                    {sortConfig.key === 'balance' && (
                      <span>
                        {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort('interestRate')}
                  >
                    Interest Rate
                    {sortConfig.key === 'interestRate' && (
                      <span>
                        {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>Monthly Payment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedLoans().map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.name}</TableCell>
                    <TableCell>{formatCurrency(loan.balance)}</TableCell>
                    <TableCell>{formatPercent(loan.interestRate)}</TableCell>
                    <TableCell>${loan.minimumPayment.toFixed(2)}/mo</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          LOAN_TYPE_CONFIG[loan.loanType || LoanType.OTHER]
                            .color
                        }
                      >
                        {
                          LOAN_TYPE_CONFIG[loan.loanType || LoanType.OTHER]
                            .label
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(loan)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(loan)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/loans/${loan.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingLoan && (
        <LoanEditDialog
          loan={editingLoan}
          open={!!editingLoan}
          onSave={(updatedLoan) => {
            onUpdateLoan(updatedLoan)
            setEditingLoan(null)
          }}
          onCancel={() => setEditingLoan(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmLoan}
        onOpenChange={() => setDeleteConfirmLoan(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirmLoan?.name}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmLoan(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LoanList
