import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, password } = req.body

    // Replace with actual registration logic
    if (email && password) {
      res.status(200).json({ message: 'Registration successful' })
    } else {
      res.status(400).json({ message: 'Error registering user' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
