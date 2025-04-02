// frontend/src/components/features/wealth-optimizer/format-utils.ts
// Replacement for formatting functions from the deleted calculations.ts

/**
 * Format percentage for display
 */
export const formatPercent = (percent: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100)
}

/**
 * Format years and months for display
 */
export const formatTimeSpan = (
  months: number,
  locale: string = 'en'
): string => {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (locale === 'da') {
    if (years === 0) {
      return `${remainingMonths} måned${remainingMonths !== 1 ? 'er' : ''}`
    } else if (remainingMonths === 0) {
      return `${years} år`
    } else {
      return `${years} år og ${remainingMonths} måned${remainingMonths !== 1 ? 'er' : ''}`
    }
  } else {
    // Default English format
    if (years === 0) {
      return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
    } else if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`
    } else {
      return `${years} year${years !== 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
    }
  }
}

/**
 * Format currency for display
 * This is a fallback method for when CurrencyFormatter component can't be used
 */
export const formatCurrency = (amount: number): string => {
  if (!isFinite(amount)) {
    return 'N/A'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  })
}
