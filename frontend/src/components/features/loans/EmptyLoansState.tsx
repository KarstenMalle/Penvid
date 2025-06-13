import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusIcon, FileTextIcon } from 'lucide-react'
import { useLocalization } from '@/context/LocalizationContext'

interface EmptyLoansStateProps {
  onAddLoan: () => void
  onImport?: () => void
}

const EmptyLoansState: React.FC<EmptyLoansStateProps> = ({
  onAddLoan,
  onImport,
}) => {
  const { t } = useLocalization()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">
          {t('loans.noLoansTitle', 'No loans yet')}
        </h3>
        <p className="text-muted-foreground mb-6">
          {t(
            'loans.noLoansDescription',
            'Get started by adding your first loan or importing existing loans.'
          )}
        </p>
        <div className="flex gap-4">
          <Button onClick={onAddLoan} size="lg">
            <PlusIcon className="mr-2 h-5 w-5" />
            {t('loans.addFirstLoan', 'Add Your First Loan')}
          </Button>
          {onImport && (
            <Button onClick={onImport} variant="outline" size="lg">
              {t('loans.importLoans', 'Import Loans')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default EmptyLoansState
