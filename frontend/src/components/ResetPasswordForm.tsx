'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'
import { authService } from '@/lib/auth-api'
import toast from 'react-hot-toast'

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTokenValid, setIsTokenValid] = useState(true)

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setIsTokenValid(false)
      setError(
        'Invalid or missing reset token. Please request a new password reset link.'
      )
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Call the reset password API
      await authService.resetPassword(password, token)

      toast.success('Password reset successful!')
      router.push('/login')
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(
        err.response?.data?.message ||
          'Failed to reset password. Please try again or request a new reset link.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          Create a new password for your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!isTokenValid ? (
          <div className="space-y-4">
            <p className="text-center">
              The password reset link is invalid or has expired.
            </p>
            <div className="flex justify-center">
              <Button asChild>
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Remembered your password?{' '}
              <Link href="/login" className="underline">
                Login
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
