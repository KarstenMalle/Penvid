import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email } = req.body

    // Replace with actual password reset logic
    if (email) {
      res.status(200).json({ message: 'Password reset link sent' })
    } else {
      res.status(400).json({ message: 'Error sending reset email' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
