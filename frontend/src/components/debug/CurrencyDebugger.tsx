// frontend/src/components/debug/CurrencyDebugger.tsx

import React, { useState } from 'react'
import { post } from '@/utils/apiHelpers'

/**
 * Debug component to test currency conversion
 * (Only use in development)
 */
const CurrencyDebugger: React.FC = () => {
  const [inputData, setInputData] = useState('')
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState(
    localStorage.getItem('currency') || 'DKK'
  )
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTestConversion = async () => {
    setLoading(true)
    setError('')

    try {
      // Parse the input JSON
      const testData = JSON.parse(inputData)

      // Call the debug endpoint
      const response = await post('/api/debug/convert-currency', testData, {
        headers: {
          'X-Currency-Preference': toCurrency,
        },
      })

      setResult(response.data)
    } catch (e: any) {
      setError(e.message || 'Error processing request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold mb-2">Currency Conversion Debugger</h3>
      <p className="text-sm text-gray-600 mb-4">
        Test how the currency middleware will convert your data
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            From Currency
          </label>
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="USD">USD ($)</option>
            <option value="DKK">DKK (kr)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">To Currency</label>
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="USD">USD ($)</option>
            <option value="DKK">DKK (kr)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Test Data (JSON)
        </label>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          className="w-full h-40 p-2 border rounded font-mono text-sm"
          placeholder={
            '{\n  "principal": 100000,\n  "interest_rate": 5.0,\n  "monthly_payment": 1887.12\n}'
          }
        />
      </div>

      <button
        onClick={handleTestConversion}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Test Conversion'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h4 className="font-bold mb-2">Conversion Result:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium mb-1">Original Data:</h5>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(result.data.original, null, 2)}
              </pre>
            </div>
            <div>
              <h5 className="font-medium mb-1">Converted Data:</h5>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(result.data.converted, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CurrencyDebugger
