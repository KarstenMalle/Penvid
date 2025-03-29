'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MdEmail as EmailIcon } from 'react-icons/md'
import { Icons } from '@/components/ui/icons'

interface ForgotPasswordFormProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function ForgotPasswordForm({
  className,
  ...props
}: ForgotPasswordFormProps) {
  const [email, setEmail] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })
    // setIsLoading(false)
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    if (response.ok) {
      setSubmitted(true)
    } else {
      alert('Error sending password reset email')
    }
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-800">
          Forgot your password?
        </h1>
      </div>
      {submitted && !isLoading ? (
        <div>
          <p className="text-center">
            Password reset email sent. Check your inbox.
          </p>
          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="underline text-blue-600 hover:underline"
            >
              Return to Log In
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p className="mt-0 mb-4 text-md text-gray-800">
            Enter the email address you signed up with and we'll send you
            instructions to reset your password.
          </p>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Remember your password?{' '}
            <Link
              href="/login"
              className="underline text-blue-600 hover:underline"
            >
              Return to Log In
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
