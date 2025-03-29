// frontend/src/components/login-form-validated.tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ErrorMessage } from '@/components/ui/error-message'

// Define schema for form validation
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function LoginForm({ className, ...props }: UserAuthFormProps) {
  const [error, setError] = React.useState('')
  const router = useRouter()
  const { login } = useAuth()

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

  // Form submission handler
  const onSubmit = async (data: LoginFormValues) => {
    setError('')

    try {
      const { error } = await login(data.email, data.password)

      if (error) {
        setError(error.message || 'Login failed')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An error occurred during login')
      console.error(err)
    }
  }

  // OAuth login handlers
  const handleGoogleLogin = async () => {
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
    } catch (err) {
      setError('An error occurred during login')
      console.error(err)
    }
  }

  const handleGithubLogin = async () => {
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
    } catch (err) {
      setError('An error occurred during login')
      console.error(err)
    }
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <ErrorMessage message={error} />

          <div className="grid gap-1 font-medium text-lg">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="Email address"
                type="email"
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

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                placeholder="Password"
                type="password"
                autoCapitalize="none"
                autoComplete="current-password"
                autoCorrect="off"
                disabled={isSubmitting}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Log In'
            )}
          </Button>
        </div>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid gap-2 mb-2">
        <Button
          variant="outline"
          type="button"
          disabled={isSubmitting}
          onClick={handleGithubLogin}
        >
          {isSubmitting ? (
            <Icons.spinner className="mr-2 mb-0.5 h-4 w-4 animate-spin" />
          ) : (
            <Icons.gitHub className="mr-2 mb-0.5 h-4 w-4" />
          )}{' '}
          GitHub
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={isSubmitting}
          onClick={handleGoogleLogin}
        >
          {isSubmitting ? (
            <Icons.spinner className="mr-2 mb-0.5 h-4 w-4 animate-spin" />
          ) : (
            <Icons.googleColor className="mr-2 mb-0.5 h-4 w-4" />
          )}{' '}
          Google
        </Button>
      </div>
    </div>
  )
}
