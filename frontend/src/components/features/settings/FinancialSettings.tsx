// frontend/src/components/features/settings/FinancialSettings.tsx

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  FinancialApiService,
  UserSettings,
} from '@/services/FinancialApiService'
import { useAuth } from '@/context/AuthContext'
import { useLocalization } from '@/context/LocalizationContext'
import { Icons } from '@/components/ui/icons'
import toast from 'react-hot-toast'

const FinancialSettings: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLocalization()
  const [settings, setSettings] = useState<UserSettings>({
    expected_inflation: 0.025,
    expected_investment_return: 0.07,
    risk_tolerance: 0.2,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const userSettings = await FinancialApiService.getUserSettings(user.id)
        setSettings(userSettings)
      } catch (error) {
        console.error('Error loading user settings:', error)
        // Use defaults if loading fails
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      await FinancialApiService.updateUserSettings(user.id, settings)
      toast.success(t('settings.savedSuccessfully'))
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(t('settings.failedToSave'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Icons.spinner className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.financialAssumptions')}</CardTitle>
        <CardDescription>
          {t('settings.financialAssumptionsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Expected Inflation */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="inflation">{t('settings.expectedInflation')}</Label>
            <span>{(settings.expected_inflation * 100).toFixed(1)}%</span>
          </div>
          <Slider
            id="inflation"
            min={0.01}
            max={0.05}
            step={0.001}
            value={[settings.expected_inflation]}
            onValueChange={(values) =>
              setSettings({ ...settings, expected_inflation: values[0] })
            }
          />
          <p className="text-sm text-gray-500">
            {t('settings.inflationDescription')}
          </p>
        </div>

        {/* Expected Investment Return */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="return">{t('settings.expectedReturn')}</Label>
            <span>
              {(settings.expected_investment_return * 100).toFixed(1)}%
            </span>
          </div>
          <Slider
            id="return"
            min={0.02}
            max={0.1}
            step={0.001}
            value={[settings.expected_investment_return]}
            onValueChange={(values) =>
              setSettings({
                ...settings,
                expected_investment_return: values[0],
              })
            }
          />
          <p className="text-sm text-gray-500">
            {t('settings.returnDescription')}
          </p>
        </div>

        {/* Risk Tolerance */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="risk">{t('settings.riskTolerance')}</Label>
            <span>{(settings.risk_tolerance * 100).toFixed(0)}%</span>
          </div>
          <Slider
            id="risk"
            min={0.05}
            max={0.35}
            step={0.01}
            value={[settings.risk_tolerance]}
            onValueChange={(values) =>
              setSettings({ ...settings, risk_tolerance: values[0] })
            }
          />
          <p className="text-sm text-gray-500">
            {t('settings.riskDescription')}
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.saveSettings')
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default FinancialSettings
