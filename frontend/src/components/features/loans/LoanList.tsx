// src/components/features/loans/LoanList.tsx

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
import { formatPercent } from '@/components/features/wealth-optimizer/format-utils'
import { Badge } from '@/components/ui/badge'
import LoanEditDialog from './LoanEditDialog'
import { CurrencyFormatter } from '@/components/ui/currency-formatter'
import { useLocalization } from '@/context/LocalizationContext'
import { CurrencySwitch } from '@/components/ui/currency-switch'

interface LoanListProps {
  loans: Loan[]
  onUpdateLoan: (loan: Loan) => void
  onDeleteLoan: (loanId: number) => void
  isLoading?: boolean
}

// Map loan types to more user-friendly labels and colors
const LOAN_TYPE_CONFIG: Record<LoanType, { color: string }> = {
  [LoanType.MORTGAGE]: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  },
  [LoanType.MORTGAGE_BOND]: {
    color:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
  },
  [LoanType.HOME_LOAN]: {
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
  },
  [LoanType.STUDENT]: {
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  },
  [LoanType.AUTO]: {
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  },
  [LoanType.CREDIT_CARD]: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  },
  [LoanType.PERSONAL]: {
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  },
  [LoanType.OTHER]: {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  },
}

const LoanList: React.FC<LoanListProps> = ({
  loans,
  onUpdateLoan,
  onDeleteLoan,
  isLoading = false,
}) => {
  const { t } = useLocalization() // Get translation function
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
          {t('loans.noLoansFound')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-1">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('loans.yourLoans')}</CardTitle>
              <CardDescription>
                {loans.length}{' '}
                {loans.length === 1
                  ? t('loans.singleLoan')
                  : t('loans.multipleLoans')}{' '}
                {t('loans.withTotalBalance')}{' '}
                <CurrencyFormatter value={totalBalance} />
              </CardDescription>
            </div>
            <CurrencySwitch minimal size="sm" />
          </div>
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
                    {t('loans.name')}
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
                    {t('loans.balance')}
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
                    {t('loans.interestRate')}
                    {sortConfig.key === 'interestRate' && (
                      <span>
                        {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>{t('loans.monthlyPayment')}</TableHead>
                  <TableHead>{t('loans.type')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedLoans().map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.name}</TableCell>
                    <TableCell>
                      <CurrencyFormatter value={loan.balance} />
                    </TableCell>
                    <TableCell>{formatPercent(loan.interestRate)}</TableCell>
                    <TableCell>
                      <CurrencyFormatter
                        value={loan.minimumPayment}
                        minimumFractionDigits={2}
                        maximumFractionDigits={2}
                      />
                      /{t('loans.month')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          (
                            LOAN_TYPE_CONFIG[loan.loanType] ??
                            LOAN_TYPE_CONFIG[LoanType.OTHER]
                          ).color
                        }
                      >
                        {t(
                          `loans.types.${(loan.loanType || LoanType.OTHER).toLowerCase()}`
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(loan)}
                          disabled={isLoading}
                          title={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(loan)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isLoading}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/loans/${loan.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('common.viewDetails')}
                          >
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
            <DialogTitle>{t('loans.confirmDeletion')}</DialogTitle>
            <DialogDescription>
              {t('loans.deleteConfirmMessage', {
                loanName: deleteConfirmLoan?.name || '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmLoan(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LoanList
