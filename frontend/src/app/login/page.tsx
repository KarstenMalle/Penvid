import Link from 'next/link'
import { Metadata } from 'next'
import { LoginForm } from '@/components/LoginForm'
import AuthLayout from '@/components/AuthLayout'

export const metadata: Metadata = {
  title: 'Login | Penvid',
  description: 'Log in to your Penvid account',
}

export default function Login() {
  return (
    <AuthLayout
      heading="Log In"
      subheading={
        <>
          New to Penvid?{' '}
          <Link
            href="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Sign up today.
          </Link>
        </>
      }
    >
      <LoginForm />
      <p className="mt-4 text-md text-center text-gray-600">
        <Link href="/forgot-password" className="text-blue-600 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </AuthLayout>
  )
}
