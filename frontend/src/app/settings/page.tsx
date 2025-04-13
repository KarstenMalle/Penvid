'use client'
import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Icons } from '@/components/ui/icons'
import toast from 'react-hot-toast'

export default function AccountSettingsPage() {
  const { user, logout } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (
      confirm(
        'Are you sure you want to delete your account? This action cannot be undone.'
      )
    ) {
      setIsLoading(true)
      try {
        // Here you would call your API to delete the account
        // For now we'll just log out the user
        toast.success('Account deletion request submitted')
        await logout()
        router.push('/')
      } catch (error) {
        console.error('Error deleting account:', error)
        toast.error('Failed to delete account')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Manage your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-gray-50 dark:bg-gray-800"
            />
            <p className="text-sm text-gray-500">
              Your email address is used for login and communications
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>These actions can't be undone</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Delete Account'
            )}
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            This will permanently delete your account and all associated data.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
