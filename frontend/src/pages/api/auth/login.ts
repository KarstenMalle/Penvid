import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyUserCredentials } from '@/lib/auth'

type LoginResponse = {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
    name?: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`,
    })
  }

  try {
    const { email, password } = req.body

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    // Verify credentials (this is a mock function - would connect to your backend in production)
    const user = verifyUserCredentials(email, password)

    if (user) {
      // In a real application, you would:
      // 1. Generate a JWT token
      // 2. Set cookies for authentication
      // 3. Return user data (excluding sensitive information)

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: '123', // Would be a real user ID in production
          email: email,
          name: 'Test User', // Would be the real user name in production
        },
      })
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}
