import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if backend is available
    const backendResponse = await fetch('http://localhost:8000/api/health')
    if (!backendResponse.ok) {
      throw new Error('Backend is not responding')
    }

    const backendData = await backendResponse.json()
    
    return res.status(200).json({
      status: 'healthy',
      backend: backendData,
      message: 'API is running'
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(500).json({
      status: 'unhealthy',
      error: 'Unable to connect to backend server',
      message: 'Please check if the backend server is running'
    })
  }
} 