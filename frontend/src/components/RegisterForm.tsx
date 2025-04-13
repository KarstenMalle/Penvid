'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'
import { PasswordStrengthIndicator } from '@/components/ui/password-strength'
import { authService } from '@/lib/auth-api'
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
const registerSchema = z
  .object({
    email: z.string().email({ message: 'Please enter a valid email address' }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const [passwordScore, setPasswordScore] = useState(0)
  const router = useRouter()

  // Check if user is already logged in
  useEffect(() => {
    const authToken = localStorage.getItem('auth_token')
    const authStatus = localStorage.getItem('auth')

    if (authToken && authStatus === 'true') {
      router.push('/dashboard')
    }
  }, [router])

  // Initialize form with react-hook-form + zod validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
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

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      // Register using our backend API
      await authService.register({
        email: data.email,
        password: data.password,
      })

      toast.success(
        'Registration successful! Please check your email to verify your account.'
      )
      router.push('/login')
    } catch (err: any) {
      console.error('Registration error:', err)
      toast.error(err.message || 'Registration failed')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {password && <PasswordStrengthIndicator score={passwordScore} />}
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}

        {password && !errors.password && (
          <div className="text-xs text-gray-500 space-y-1 mt-1">
            <p>Password must contain:</p>
            <ul className="list-disc list-inside space-y-1">
              <li className={password.length >= 8 ? 'text-green-500' : ''}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>
                At least one uppercase letter
              </li>
              <li className={/[a-z]/.test(password) ? 'text-green-500' : ''}>
                At least one lowercase letter
              </li>
              <li className={/[0-9]/.test(password) ? 'text-green-500' : ''}>
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
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Sign up'
        )}
      </Button>
    </form>
  )
}
