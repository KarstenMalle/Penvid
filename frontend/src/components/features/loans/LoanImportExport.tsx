import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loan } from '@/components/features/wealth-optimizer/types'
import {
  ChevronDownIcon,
  ImportIcon,
  ExportIcon,
  AlertCircleIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'

interface LoanImportExportProps {
  loans: Loan[]
  onImport: (loans: Loan[]) => void
  disabled?: boolean
}

const LoanImportExport: React.FC<LoanImportExportProps> = ({
  loans,
  onImport,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importError, setImportError] = useState('')
  const [previewLoans, setPreviewLoans] = useState<Loan[]>([])

  // Export loans as JSON file
  const handleExport = () => {
    try {
      // Create a JSON string from the loans
      const loansData = JSON.stringify(loans, null, 2)

      // Create a blob from the JSON string
      const blob = new Blob([loansData], { type: 'application/json' })

      // Create a download link and trigger it
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `penvid_loans_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Loans exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export loans')
    }
  }

  // Trigger file input click
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Read the file as text
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const importedLoans = JSON.parse(content)

        // Validate the imported data
        if (!Array.isArray(importedLoans)) {
          setImportError('Invalid format: Expected an array of loans')
          setIsImportDialogOpen(true)
          return
        }

        // Validate each loan has the required fields
        const validatedLoans = importedLoans.filter((loan) => {
          return (
            typeof loan === 'object' &&
            loan !== null &&
            'name' in loan &&
            'balance' in loan &&
            'interestRate' in loan
          )
        })

        if (validatedLoans.length === 0) {
          setImportError('No valid loans found in the file')
          setIsImportDialogOpen(true)
          return
        }

        if (validatedLoans.length < importedLoans.length) {
          setImportError(
            `Warning: Only ${validatedLoans.length} out of ${importedLoans.length} loans were valid`
          )
        } else {
          setImportError('')
        }

        // Set loans for preview
        setPreviewLoans(validatedLoans)
        setIsImportDialogOpen(true)
      } catch (error) {
        console.error('Import error:', error)
        setImportError(
          'Failed to parse the file. Please ensure it is a valid JSON file.'
        )
        setIsImportDialogOpen(true)
      }
    }

    reader.readAsText(file)

    // Reset file input
    e.target.value = ''
  }

  // Confirm import
  const confirmImport = () => {
    onImport(previewLoans)
    setIsImportDialogOpen(false)
    setPreviewLoans([])
    setImportError('')
  }

  // Cancel import
  const cancelImport = () => {
    setIsImportDialogOpen(false)
    setPreviewLoans([])
    setImportError('')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled}>
            Import/Export <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleImportClick} disabled={disabled}>
            <ImportIcon className="mr-2 h-4 w-4" /> Import Loans
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleExport}
            disabled={disabled || loans.length === 0}
          >
            <ExportIcon className="mr-2 h-4 w-4" /> Export Loans
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={cancelImport}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Loans</DialogTitle>
            <DialogDescription>
              Review the loans before importing them into your account.
            </DialogDescription>
          </DialogHeader>

          {importError && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-4 flex items-start mb-4">
              <AlertCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>{importError}</div>
            </div>
          )}

          {previewLoans.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Balance</th>
                    <th className="text-left p-2">Interest Rate</th>
                    <th className="text-left p-2">Term (Years)</th>
                    <th className="text-left p-2">Monthly Payment</th>
                    <th className="text-left p-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {previewLoans.map((loan, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{loan.name}</td>
                      <td className="p-2">
                        ${loan.balance?.toFixed(2) || '0.00'}
                      </td>
                      <td className="p-2">
                        {loan.interestRate?.toFixed(2) || '0.00'}%
                      </td>
                      <td className="p-2">
                        {loan.termYears?.toFixed(2) || 'N/A'}
                      </td>
                      <td className="p-2">
                        ${loan.minimumPayment?.toFixed(2) || '0.00'}/mo
                      </td>
                      <td className="p-2">{loan.loanType || 'Other'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelImport}>
              Cancel
            </Button>
            <Button
              onClick={confirmImport}
              disabled={previewLoans.length === 0}
            >
              Import {previewLoans.length} Loans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default LoanImportExport
