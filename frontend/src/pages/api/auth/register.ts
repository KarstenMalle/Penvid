import { NextApiRequest, NextApiResponse } from 'next'

type RegisterResponse = {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>
) {
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

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      })
    }

    // In a real implementation, you would:
    // 1. Check if the user already exists
    // 2. Hash the password
    // 3. Store user in database
    // 4. Send verification email if needed

    // For demo purposes, we'll just return success
    return res.status(200).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: '123',
        email: email,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}
