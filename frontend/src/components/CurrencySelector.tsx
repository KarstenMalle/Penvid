'use client'

import { useEffect, useState } from 'react'
import { useCurrency } from '@/context/CurrencyContext'
import { Button } from '@/components/ui/button'
import { ArrowDownIcon, CheckIcon } from 'lucide-react'

export default function CurrencySelector() {
  const { currency, setCurrency, supportedCurrencies, loading } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)
  const [isChanging, setIsChanging] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  const handleCurrencyChange = async (newCurrency: string) => {
    if (currency === newCurrency) {
      setIsOpen(false)
      return
    }

    try {
      setIsChanging(true)
      await setCurrency(newCurrency as 'USD' | 'DKK')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to change currency:', error)
    } finally {
      setIsChanging(false)
    }
  }

  // Stop propagation to prevent dropdown from closing when clicking on it
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Currency symbols mapping
  const currencySymbols: { [key: string]: string } = {
    USD: '$',
    DKK: 'kr',
  }

  return (
    <div className="relative" onClick={handleDropdownClick}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading || isChanging}
        className="flex items-center gap-1 font-mono"
      >
        {currencySymbols[currency] || currency}
        <ArrowDownIcon size={16} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-md shadow-lg z-50">
          <ul className="py-1">
            {supportedCurrencies.map((curr) => (
              <li
                key={curr}
                className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-accent ${
                  currency === curr ? 'bg-accent/50' : ''
                }`}
                onClick={() => handleCurrencyChange(curr)}
              >
                <span className="font-mono">
                  {currencySymbols[curr]} {curr}
                </span>
                {currency === curr && <CheckIcon size={16} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
