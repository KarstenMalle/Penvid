// frontend/src/components/features/wealth-optimizer/format-utils.ts
// Formatting utilities only - all calculation logic has been moved to the backend

/**
 * Format a percentage value for display
 * @param percent Percentage value (e.g., 5.8 for 5.8%)
 * @returns Formatted percentage string (e.g., "5.80%")
 */
export const formatPercent = (percent: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100)
}

/**
 * Format a timespan in months to a readable string
 * @param months Number of months
 * @param locale Locale for formatting (e.g., 'en', 'da')
 * @returns Formatted timespan (e.g., "2 years and 3 months")
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
 * Format a date string to a readable date format
 * @param dateString ISO date string
 * @param locale Locale for formatting
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string,
  locale: string = 'en'
): string => {
  try {
    const date = new Date(dateString)

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: locale === 'da' ? 'long' : 'short',
      day: 'numeric',
    }

    return new Intl.DateTimeFormat(
      locale === 'da' ? 'da-DK' : 'en-US',
      options
    ).format(date)
  } catch (error) {
    // Fallback to simpler formatting if Intl API fails
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }
}

/**
 * Format a currency value for display - fallback if CurrencyFormatter component can't be used
 * @param amount Amount to format
 * @param options Formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  options: {
    originalCurrency?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string => {
  const {
    originalCurrency = 'USD',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: originalCurrency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount)
  } catch (error) {
    // Super simple fallback
    return originalCurrency === 'USD'
      ? `$${Math.round(amount).toLocaleString()}`
      : `${Math.round(amount).toLocaleString()} ${originalCurrency}`
  }
}

/**
 * Format a numeric value with appropriate thousands separators
 * @param value Numeric value
 * @param locale Locale for formatting
 * @returns Formatted string
 */
export const formatNumber = (
  value: number,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale).format(value)
}

/**
 * Format a large numeric value with K, M, B suffixes (e.g., 1.2M)
 * @param value Numeric value
 * @param decimals Number of decimal places
 * @returns Formatted string with appropriate suffix
 */
export const formatCompactNumber = (
  value: number,
  decimals: number = 1
): string => {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`
  } else if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`
  } else if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`
  } else {
    return value.toFixed(decimals)
  }
}

/**
 * Format a number as readable dollars and cents
 * @param value Dollar amount
 * @param includeCents Whether to include cents in the output
 * @returns Formatted dollar string
 */
export const formatDollars = (
  value: number,
  includeCents: boolean = true
): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0,
  })

  return formatter.format(value)
}
