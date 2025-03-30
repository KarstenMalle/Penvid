'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'
import AuthLayout from '@/components/AuthLayout'
import { PasswordStrengthIndicator } from '@/components/ui/password-strength'
import toast from 'react-hot-toast'

// Define a strong password schema
const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  .regex(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^A-Za-z0-9]/, {
    message: 'Password must contain at least one special character',
  })

// Define schema for the form
const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [passwordScore, setPasswordScore] = useState(0)
  const router = useRouter()

  // Initialize form with react-hook-form + zod validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  // Watch the password field to calculate strength
  const password = watch('password')

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordScore(0)
      return
    }

    let score = 0

    // Length
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1

    // Complexity
    if (/[A-Z]/.test(password)) score += 1
    if (/[a-z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    // Variety
    const uniqueChars = new Set(password).size
    if (uniqueChars > 8) score += 1

    // Normalize to a 0-100 score
    setPasswordScore(Math.min(100, Math.round((score / 7) * 100)))
  }, [password])

  // Check if user is authenticated for password reset
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        // If no session, redirect to forgot-password
        if (!session) {
          router.push('/forgot-password')
        }
      } catch (err) {
        console.error('Error checking session:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setError('')
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        setError(error.message || 'Error resetting password')
        toast.error(error.message || 'Error resetting password')
      } else {
        setSuccess(true)
        toast.success('Password reset successfully!')
        // Redirect to login after a few seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      toast.error(err.message || 'An unexpected error occurred')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      heading="Reset Password"
      subheading="Create a new secure password for your account."
    >
      {success ? (
        <div>
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            <p className="text-center">
              Your password has been reset successfully. You will be redirected
              to the login page.
            </p>
          </div>
          <Button onClick={() => router.push('/login')} className="mt-4 w-full">
            Go to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="New password"
              className="w-full"
              disabled={isLoading}
              {...register('password')}
            />
            {password && <PasswordStrengthIndicator score={passwordScore} />}
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}

            {password && !errors.password && (
              <div className="text-xs text-gray-500 space-y-1 mt-1">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside">
                  <li className={password.length >= 8 ? 'text-green-500' : ''}>
                    At least 8 characters
                  </li>
                  <li
                    className={/[A-Z]/.test(password) ? 'text-green-500' : ''}
                  >
                    At least one uppercase letter
                  </li>
                  <li
                    className={/[a-z]/.test(password) ? 'text-green-500' : ''}
                  >
                    At least one lowercase letter
                  </li>
                  <li
                    className={/[0-9]/.test(password) ? 'text-green-500' : ''}
                  >
                    At least one number
                  </li>
                  <li
                    className={
                      /[^A-Za-z0-9]/.test(password) ? 'text-green-500' : ''
                    }
                  >
                    At least one special character
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              className="w-full"
              disabled={isLoading}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
