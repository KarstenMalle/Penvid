'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'
import { authService } from '@/lib/auth-api'
import toast from 'react-hot-toast'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Use our backend API to request password reset
      await authService.forgotPassword(email)

      setIsSubmitted(true)
      toast.success('Password reset email sent')
    } catch (err: any) {
      console.error('Forgot password error:', err)
      setError(err.message || 'Failed to send password reset email')
      toast.error(err.message || 'Failed to send password reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="bg-green-50 text-green-800 p-4 rounded-md mb-4">
          <p className="font-medium">Password reset email sent!</p>
          <p className="mt-2">
            Check your inbox for instructions to reset your password.
          </p>
        </div>
        <Button onClick={() => router.push('/login')} className="mt-4">
          Return to Login
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            Sending reset link...
          </>
        ) : (
          'Send reset link'
        )}
      </Button>
    </form>
  )
}
