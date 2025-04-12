import { useEffect, useState } from 'react'
import { ApiClient } from '@/services/ApiClient'

export default function HealthCheck() {
  const [health, setHealth] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await ApiClient.get('/api/health')
        if (response.status === 'success') {
          setHealth(response.data)
        } else {
          setError(response.error as string)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    }

    checkHealth()
  }, [])

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        <h2 className="text-xl font-bold mb-2">Health Check Failed</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!health) {
    return (
      <div className="p-4 bg-gray-100 text-gray-700 rounded">
        <p>Loading health check...</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-green-100 text-green-700 rounded">
      <h2 className="text-xl font-bold mb-2">API Health Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-1">System Info</h3>
          <pre className="text-sm bg-white p-2 rounded overflow-auto">
            {JSON.stringify(health.system_info, null, 2)}
          </pre>
        </div>
        <div>
          <h3 className="font-semibold mb-1">API Status</h3>
          <pre className="text-sm bg-white p-2 rounded overflow-auto">
            {JSON.stringify(health.api_status, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
} 