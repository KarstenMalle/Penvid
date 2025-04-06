// frontend/src/components/debug/PaymentAnalysisDebugger.tsx

import React, { useState, useEffect } from 'react'
import { post } from '@/utils/api-helper'

/**
 * Debug component specifically for diagnosing payment analysis currency issues
 */
const PaymentAnalysisDebugger: React.FC = () => {
  const [loan, setLoan] = useState({
    id: 1,
    balance: 100000,
    interestRate: 5,
    termYears: 10,
    minimumPayment: 1060.66,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [currencyPreference, setCurrencyPreference] = useState(
    localStorage.getItem('currency') || 'USD'
  )
  const [error, setError] = useState('')

  // Effect to update when currency preference changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrencyPreference(localStorage.getItem('currency') || 'USD')
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleTestAnalysis = async () => {
    setLoading(true)
    setError('')

    try {
      // First make a normal API call to the loan calculation endpoint
      const response = await post(
        `/api/loans/${loan.id}/amortization`,
        {
          principal: loan.balance,
          annual_rate: loan.interestRate,
          monthly_payment: loan.minimumPayment,
          extra_payment: 0,
        },
        {
          requiresAuth: false,
          headers: {
            'X-Currency-Preference': currencyPreference,
          },
        }
      )

      // Now call our debug endpoint with the same data
      const debugResponse = await post(
        '/api/debug/convert-currency',
        {
          principal: loan.balance,
          annual_rate: loan.interestRate,
          monthly_payment: loan.minimumPayment,
          extra_payment: 0,
        },
        {
          headers: {
            'X-Currency-Preference': currencyPreference,
          },
        }
      )

      // Set the combined results
      setResult({
        apiResponse: response.data,
        debugResult: debugResponse.data,
      })
    } catch (e: any) {
      setError(e.message || 'Error testing payment analysis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold mb-2">Payment Analysis Debugger</h3>
      <p className="text-sm text-gray-600 mb-4">
        Test currency conversion with the payment analysis API
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Loan ID</label>
          <input
            type="number"
            value={loan.id}
            onChange={(e) =>
              setLoan({ ...loan, id: parseInt(e.target.value) || 1 })
            }
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Current Currency Preference
          </label>
          <div className="flex items-center">
            <div className="p-2 border rounded bg-gray-100 w-full">
              {currencyPreference}
            </div>
            <button
              onClick={() => {
                const newCurrency = currencyPreference === 'USD' ? 'DKK' : 'USD'
                localStorage.setItem('currency', newCurrency)
                setCurrencyPreference(newCurrency)
              }}
              className="ml-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Toggle
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Balance</label>
          <input
            type="number"
            value={loan.balance}
            onChange={(e) =>
              setLoan({ ...loan, balance: parseFloat(e.target.value) || 0 })
            }
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            value={loan.interestRate}
            onChange={(e) =>
              setLoan({
                ...loan,
                interestRate: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Term (Years)</label>
          <input
            type="number"
            value={loan.termYears}
            onChange={(e) =>
              setLoan({ ...loan, termYears: parseFloat(e.target.value) || 0 })
            }
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Monthly Payment
          </label>
          <input
            type="number"
            value={loan.minimumPayment}
            onChange={(e) =>
              setLoan({
                ...loan,
                minimumPayment: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      <button
        onClick={handleTestAnalysis}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Test Payment Analysis API'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h4 className="font-bold mb-2">API Response vs Debug Conversion:</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium mb-1">API Response:</h5>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(result.apiResponse, null, 2)}
              </pre>
            </div>
            <div>
              <h5 className="font-medium mb-1">Debug Conversion:</h5>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(result.debugResult, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentAnalysisDebugger
