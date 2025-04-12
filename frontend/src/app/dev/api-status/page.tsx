// frontend/src/app/dev/api-status/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

const endpoints = [
  { name: 'Health Check', url: '/api/health', auth: false },
  { name: 'Translations', url: '/api/translations', auth: false },
  { name: 'User Settings', url: '/api/user/{user_id}/settings', auth: true },
  { name: 'Loans', url: '/api/user/{user_id}/loans', auth: true },
  { name: 'Debug Info', url: '/api/debug/health', auth: false },
  { name: 'Debug User', url: '/api/debug/user-info', auth: true },
]

export default function ApiStatusPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const testEndpoint = async (endpoint: (typeof endpoints)[0]) => {
    if (endpoint.auth && !user) {
      setResults((prev) => ({
        ...prev,
        [endpoint.url]: { status: 'error', message: 'Authentication required' },
      }))
      return
    }

    setLoading((prev) => ({ ...prev, [endpoint.url]: true }))

    try {
      const url = endpoint.url.replace('{user_id}', user?.id || '')

      // Get auth token if needed
      let headers = {}
      if (endpoint.auth) {
        const { createClient } = await import('@/lib/supabase-browser')
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        if (data.session?.access_token) {
          headers = {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${url}`,
        { headers }
      )
      const data = await response.json()

      setResults((prev) => ({
        ...prev,
        [endpoint.url]: {
          status: 'success',
          statusCode: response.status,
          data: data,
        },
      }))
    } catch (error) {
      console.error(`Error testing ${endpoint.url}:`, error)
      setResults((prev) => ({
        ...prev,
        [endpoint.url]: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [endpoint.url]: false }))
    }
  }

  const testAllEndpoints = async () => {
    const authEndpoints = endpoints.filter((e) => !e.auth)
    await Promise.all(authEndpoints.map(testEndpoint))

    if (user) {
      const authEndpoints = endpoints.filter((e) => e.auth)
      await Promise.all(authEndpoints.map(testEndpoint))
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">API Status Dashboard</h1>

      <div className="flex justify-between items-center mb-4">
        <div>
          <p>User: {user ? user.email : 'Not logged in'}</p>
        </div>
        <Button onClick={testAllEndpoints}>Test All Endpoints</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {endpoints.map((endpoint) => (
          <Card key={endpoint.url}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{endpoint.name}</span>
                {endpoint.auth && (
                  <span className="text-sm bg-blue-100 px-2 py-1 rounded-full">
                    Auth Required
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono mb-2">{endpoint.url}</p>

              {loading[endpoint.url] ? (
                <p>Loading...</p>
              ) : results[endpoint.url] ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${results[endpoint.url].status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                    ></div>
                    <span>
                      {results[endpoint.url].status === 'success'
                        ? 'Success'
                        : 'Error'}
                    </span>
                  </div>
                  {results[endpoint.url].status === 'success' ? (
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(results[endpoint.url].data, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-red-500">
                      {results[endpoint.url].message}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Not tested yet</p>
              )}
            </CardContent>
            <CardFooter>
              <Button size="sm" onClick={() => testEndpoint(endpoint)}>
                Test Endpoint
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
