import { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm'
import AuthLayout from '@/components/AuthLayout'

export const metadata: Metadata = {
  title: 'Forgot Password | Penvid',
  description: 'Reset your Penvid account password',
}

export default function ForgotPassword() {
  return (
    <AuthLayout
      heading="Forgot your password?"
      subheading="Enter your email address and we'll send you a link to reset your password."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
