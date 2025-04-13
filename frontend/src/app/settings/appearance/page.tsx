'use client'
import { useTheme } from 'next-themes'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Customize how Penvid looks for you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select Theme</Label>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${
                  theme === 'light'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                } cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800`}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-6 w-6" />
                <span>Light</span>
              </div>
              <div
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${
                  theme === 'dark'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                } cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800`}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-6 w-6" />
                <span>Dark</span>
              </div>
              <div
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${
                  theme === 'system'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                } cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800`}
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-6 w-6" />
                <span>System</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              System theme will automatically switch between light and dark
              modes based on your device settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
