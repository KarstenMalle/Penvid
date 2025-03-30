'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
import { PasswordStrengthIndicator } from '@/components/ui/password-strength'
import { motion } from 'framer-motion'
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

// Define schema for the entire form
const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { message: 'Name must be at least 2 characters long' }),
    email: z.string().email({ message: 'Please enter a valid email address' }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function RegisterForm({ className, ...props }: UserAuthFormProps) {
  const [error, setError] = React.useState('')
  const [passwordScore, setPasswordScore] = React.useState(0)
  const router = useRouter()
  const { signUp } = useAuth()

  // Initialize form with react-hook-form + zod validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // Watch the password field to calculate strength
  const password = watch('password')

  // Calculate password strength
  React.useEffect(() => {
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

  // Form submission handler
  const onSubmit = async (data: RegisterFormValues) => {
    setError('')

    try {
      const { error } = await signUp(data.email, data.password, {
        name: data.fullName,
      })

      if (error) {
        setError(error.message || 'Error creating account')
      } else {
        toast.success(
          'Account created successfully! Please check your email to confirm your account.'
        )
        router.push('/login?registered=true')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      console.error(err)
    }
  }

  // OAuth signup handlers
  async function handleGoogleSignUp() {
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError(error.message || 'Failed to sign up with Google')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up')
      console.error(err)
    }
  }

  async function handleGithubSignUp() {
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError(error.message || 'Failed to sign up with GitHub')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up')
      console.error(err)
    }
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
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              type="text"
              autoCapitalize="words"
              autoCorrect="off"
              disabled={isSubmitting}
              {...register('fullName')}
              className={errors.fullName ? 'border-red-300' : ''}
            />
            {errors.fullName && (
              <p className="text-sm text-red-500">{errors.fullName.message}</p>
            )}
          </div>

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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect="off"
              disabled={isSubmitting}
              {...register('password')}
              className={errors.password ? 'border-red-300' : ''}
            />
            {password && <PasswordStrengthIndicator score={passwordScore} />}
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}

            {password && !errors.password && (
              <div className="text-xs text-gray-500 space-y-1 mt-1">
                <p className="font-medium">Password must contain:</p>
                <ul className="space-y-1 pl-5">
                  <li
                    className={`flex items-center ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3.5 w-3.5 mr-2 ${password.length >= 8 ? 'text-green-600' : 'text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      {password.length >= 8 ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      )}
                    </svg>
                    At least 8 characters
                  </li>
                  <li
                    className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3.5 w-3.5 mr-2 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      {/[A-Z]/.test(password) ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      )}
                    </svg>
                    At least one uppercase letter
                  </li>
                  <li
                    className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3.5 w-3.5 mr-2 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      {/[a-z]/.test(password) ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      )}
                    </svg>
                    At least one lowercase letter
                  </li>
                  <li
                    className={`flex items-center ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3.5 w-3.5 mr-2 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      {/[0-9]/.test(password) ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      )}
                    </svg>
                    At least one number
                  </li>
                  <li
                    className={`flex items-center ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3.5 w-3.5 mr-2 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      {/[^A-Za-z0-9]/.test(password) ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      )}
                    </svg>
                    At least one special character
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              placeholder="••••••••"
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect="off"
              disabled={isSubmitting}
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-red-300' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={handleGithubSignUp}
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
            onClick={handleGoogleSignUp}
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
