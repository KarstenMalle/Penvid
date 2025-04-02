// frontend/src/components/features/wealth-optimizer/format-utils.ts
// This file contains only formatting utilities, with calculations moved to backend

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

    return new Intl.DateTimeFormatter(
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
 * Format a currency value for display - this is a fallback
 * that should only be used when CurrencyFormatter component can't be used
 * @param amount Amount to format
 * @param currencyCode Currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currencyCode: string = 'USD'
): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch (error) {
    // Super simple fallback
    return currencyCode === 'USD'
      ? `$${Math.round(amount).toLocaleString()}`
      : `${Math.round(amount).toLocaleString()} ${currencyCode}`
  }
}
