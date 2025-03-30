'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

// Define schema for form validation
const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function LoginForm({ className, ...props }: UserAuthFormProps) {
  const [error, setError] = React.useState('')
  const [redirecting, setRedirecting] = React.useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, loading } = useAuth()

  // Check for registered parameter to show success message
  const registered = searchParams.get('registered')

  // Initialize form with react-hook-form + zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Helper function to redirect to dashboard
  const redirectToDashboard = () => {
    if (redirecting) return
    setRedirecting(true)
    console.log('Redirecting to dashboard')

    // Force page reload to ensure clean state
    window.location.replace('/dashboard')
  }

  // Check for session and redirect if already authenticated
  React.useEffect(() => {
    if (!loading && isAuthenticated && !redirecting) {
      redirectToDashboard()
    }
  }, [loading, isAuthenticated])

  // Handle form submission
  const onSubmit = async (data: LoginFormValues) => {
    if (redirecting) return
    setError('')

    try {
      console.log('Submitting login form')
      const { error } = await login(data.email, data.password)

      if (error) {
        console.log('Login error:', error)
        setError(error.message || 'Login failed')
      } else {
        // Login successful, redirect after a short delay
        console.log('Login successful, redirecting shortly')
        toast.success('Login successful!')

        // Wait a moment for state to update
        setTimeout(() => {
          redirectToDashboard()
        }, 500)
      }
    } catch (err: any) {
      console.error('Login exception:', err)
      setError('An unexpected error occurred')
    }
  }

  // OAuth login handlers
  const handleGoogleLogin = async () => {
    if (redirecting) return
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError(error.message || 'Failed to log in with Google')
      }
    } catch (err: any) {
      setError('An error occurred during login')
    }
  }

  const handleGithubLogin = async () => {
    if (redirecting) return
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError(error.message || 'Failed to log in with GitHub')
      }
    } catch (err: any) {
      setError('An error occurred during login')
    }
  }

  // Show success message when registered successfully
  React.useEffect(() => {
    if (registered === 'true') {
      toast.success(
        'Registration successful! Please check your email for verification.'
      )
    }
  }, [registered])

  // Show loading state during redirect
  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Icons.spinner className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-center text-gray-600">Redirecting to dashboard...</p>
      </div>
    )
  }

  // Avoid showing login form while still checking authentication
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Icons.spinner className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-center text-gray-600">Checking authentication...</p>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="your.email@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isSubmitting}
              {...register('email')}
              className={errors.email ? 'border-red-300' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect="off"
              disabled={isSubmitting}
              {...register('password')}
              className={errors.password ? 'border-red-300' : ''}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Log In'
            )}
          </Button>
        </form>

        <div className="relative mt-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={handleGithubLogin}
            className="bg-white hover:bg-gray-50"
          >
            {isSubmitting ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.gitHub className="mr-2 h-4 w-4" />
            )}{' '}
            GitHub
          </Button>

          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleLogin}
            className="bg-white hover:bg-gray-50"
          >
            {isSubmitting ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.googleColor className="mr-2 h-4 w-4" />
            )}{' '}
            Google
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
