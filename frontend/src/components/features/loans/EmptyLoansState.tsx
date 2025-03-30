import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlusIcon, DatabaseIcon } from 'lucide-react'

interface EmptyLoansStateProps {
  onAddLoan: () => void
}

const EmptyLoansState: React.FC<EmptyLoansStateProps> = ({ onAddLoan }) => {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-4 mb-4">
          <DatabaseIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Loans Yet</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
          You haven't added any loans yet. Add your first loan to start tracking
          your debt and optimize your payoff strategy.
        </p>
        <div className="flex gap-4">
          <Button onClick={onAddLoan} className="flex items-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Your First Loan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default EmptyLoansState
