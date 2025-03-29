'use client'

import * as React from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Define schema for form validation
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordFormProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function ForgotPasswordForm({
  className,
  ...props
}: ForgotPasswordFormProps) {
  const [submitted, setSubmitted] = React.useState(false)
  const { resetPassword } = useAuth()

  // Initialize form with react-hook-form + zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      const { error } = await resetPassword(data.email)

      if (error) {
        toast.error(error.message || 'Error sending password reset email')
      } else {
        setSubmitted(true)
        toast.success('Password reset email sent!')
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred')
      console.error(err)
    }
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-600"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Reset link sent!
              </h3>
              <p className="text-green-700 mb-4">
                Check your email for a link to reset your password. If it
                doesn't appear within a few minutes, check your spam folder.
              </p>
              <div className="flex justify-center">
                <Link
                  href="/login"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isSubmitting}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <div className="text-center text-sm">
              Remember your password?{' '}
              <Link
                href="/login"
                className="text-blue-600 hover:underline font-medium"
              >
                Back to Login
              </Link>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
