import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loan } from '@/components/features/wealth-optimizer/types'

interface LoanFormProps {
  loans: Loan[]
  onAddLoan: () => void
  onRemoveLoan: (id: number) => void
  onUpdateLoan: (id: number, field: keyof Loan, value: string | number) => void
  showCalculatedPayment?: boolean
}

/**
 * A reusable component for adding and editing loan information.
 * Can be used across different financial tools in the app.
 */
const LoanForm: React.FC<LoanFormProps> = ({
  loans,
  onAddLoan,
  onRemoveLoan,
  onUpdateLoan,
  showCalculatedPayment = true,
}) => {
  // Calculate payment needed to pay off a loan in a given number of years
  const calculateMonthlyPayment = (
    principal: number,
    annualRate: number,
    years: number
  ): number => {
    const monthlyRate = annualRate / 100 / 12
    const numPayments = years * 12

    if (monthlyRate === 0) return principal / numPayments

    return (
      (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Loans</h3>
        <Button onClick={onAddLoan} variant="outline" size="sm">
          + Add Loan
        </Button>
      </div>

      {loans.length > 0 ? (
        <div className="space-y-6">
          {loans.map((loan) => (
            <Card key={loan.id} className="p-4 relative">
              <Button
                variant="ghost"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={() => onRemoveLoan(loan.id)}
              >
                ✕
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor={`loan-name-${loan.id}`}>Loan Name</Label>
                  <Input
                    id={`loan-name-${loan.id}`}
                    value={loan.name}
                    onChange={(e) =>
                      onUpdateLoan(loan.id, 'name', e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor={`loan-balance-${loan.id}`}>Balance ($)</Label>
                  <Input
                    id={`loan-balance-${loan.id}`}
                    type="number"
                    min="0"
                    value={loan.balance}
                    onChange={(e) =>
                      onUpdateLoan(loan.id, 'balance', e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor={`loan-interest-${loan.id}`}>
                    Interest Rate (%)
                  </Label>
                  <Input
                    id={`loan-interest-${loan.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={loan.interestRate}
                    onChange={(e) =>
                      onUpdateLoan(loan.id, 'interestRate', e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor={`loan-term-${loan.id}`}>Term (Years)</Label>
                  <Input
                    id={`loan-term-${loan.id}`}
                    type="number"
                    min="1"
                    value={loan.termYears}
                    onChange={(e) =>
                      onUpdateLoan(loan.id, 'termYears', e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor={`loan-payment-${loan.id}`}>
                    Minimum Monthly Payment ($)
                  </Label>
                  <Input
                    id={`loan-payment-${loan.id}`}
                    type="number"
                    min="0"
                    value={loan.minimumPayment}
                    onChange={(e) =>
                      onUpdateLoan(loan.id, 'minimumPayment', e.target.value)
                    }
                  />
                </div>
              </div>

              {showCalculatedPayment &&
                loan.balance > 0 &&
                loan.interestRate > 0 &&
                loan.termYears > 0 && (
                  <div className="mt-4 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Calculated Payment: </span>$
                      {calculateMonthlyPayment(
                        loan.balance,
                        loan.interestRate,
                        loan.termYears
                      ).toFixed(2)}
                      /month
                    </p>
                    {loan.minimumPayment <
                      calculateMonthlyPayment(
                        loan.balance,
                        loan.interestRate,
                        loan.termYears
                      ) && (
                      <p className="text-amber-600 mt-1">
                        Warning: Your minimum payment may be too low to pay off
                        this loan in {loan.termYears} years.
                      </p>
                    )}
                  </div>
                )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 border border-dashed rounded-lg">
          <p className="text-gray-500">
            No loans added yet. Click "Add Loan" to begin.
          </p>
        </div>
      )}
    </div>
  )
}

export default LoanForm
