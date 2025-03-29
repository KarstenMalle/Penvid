'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { InputIcon } from '@/components/ui/input-icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MdEmail as EmailIcon } from 'react-icons/md'
import { IoLockClosed as PasswordIcon } from 'react-icons/io5'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function RegisterForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (response.ok) {
      router.push('/login') // Redirect to login after successful registration
    } else {
      alert('Error creating account')
    }

    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <div className="grid gap-1 font-medium text-lg">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="Email address"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              required
            />
            {/*<InputIcon*/}
            {/*  id="email"*/}
            {/*  placeholder="Email address"*/}
            {/*  type="email"*/}
            {/*  autoCapitalize="none"*/}
            {/*  autoComplete="email"*/}
            {/*  autoCorrect="off"*/}
            {/*  disabled={isLoading}*/}
            {/*  iconProps={{ behavior: 'prepend' }}*/}
            {/*  icon={EmailIcon}*/}
            {/*/>*/}
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              placeholder="Password"
              type="password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect="off"
              disabled={isLoading}
              required
            />

            {/*<InputIcon*/}
            {/*  id="password"*/}
            {/*  placeholder="Password"*/}
            {/*  type="password"*/}
            {/*  autoCapitalize="none"*/}
            {/*  autoComplete="password"*/}
            {/*  autoCorrect="off"*/}
            {/*  disabled={isLoading}*/}
            {/*  iconProps={{ behavior: 'prepend' }}*/}
            {/*  icon={PasswordIcon}*/}
            {/*/>*/}
          </div>
          <Button type={'submit'} disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign Up
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
        <Button variant="outline" type="button" disabled={isLoading}>
          {isLoading ? (
            <Icons.spinner className="mr-2 mb-0.5 h-4 w-4 animate-spin" />
          ) : (
            <Icons.gitHub className="mr-2 mb-0.5 h-4 w-4" />
          )}{' '}
          GitHub
        </Button>
        <Button variant="outline" type="button" disabled={isLoading}>
          {isLoading ? (
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
