import Link from 'next/link'
import { Metadata } from 'next'
import { RegisterForm } from '@/components/RegisterForm'
import AuthLayout from '@/components/AuthLayout'

export const metadata: Metadata = {
  title: 'Sign Up | Penvid',
  description: 'Create a new Penvid account',
}

export default function Register() {
  return (
    <AuthLayout
      heading="Sign Up"
      subheading={
        <>
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            Log in.
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  )
}
