import { NextApiRequest, NextApiResponse } from 'next'

type ForgotPasswordResponse = {
  success: boolean
  message: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ForgotPasswordResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`,
    })
  }

  try {
    const { email } = req.body

    // Basic validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      })
    }

    // In a real implementation, you would:
    // 1. Check if the user exists
    // 2. Generate a password reset token
    // 3. Send a password reset email
    // 4. Store the token in the database with an expiration time

    // For demo purposes, we'll just return success
    // Simulate a slight delay for more realistic UX
    setTimeout(() => {
      return res.status(200).json({
        success: true,
        message: 'Password reset email sent',
      })
    }, 1000)
  } catch (error) {
    console.error('Forgot password error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}
