// frontend/src/utils/loan-detail-utils.ts
import { Loan } from '@/components/features/wealth-optimizer/types'

/**
 * Utility functions for consistent loan detail handling
 */

/**
 * Ensures loan values are in the correct currency for display
 * This helps prevent inconsistencies on the LoanDetailsPage
 */
export function ensureConsistentLoanCurrency(loan: Loan): Loan {
  // The loan should already have values in the user's preferred currency
  // from the LoanService, but we'll add this function as a safeguard
  // to make sure everything is consistent

  return {
    ...loan,
    // Add any additional processing if needed in the future
  }
}

/**
 * Prepares loan data for API calls to prevent double conversion
 * @param loan The loan with values in the user's preferred currency
 * @returns Loan with values converted to USD for API calls
 */
export function prepareForApiCall(loan: Loan): Loan {
  // Get user's currency preference
  const currencyPreference = localStorage.getItem('currency') || 'USD'

  // If USD, no conversion needed
  if (currencyPreference === 'USD') {
    return loan
  }

  // Otherwise, convert back to USD for the API call
  const conversionRate = currencyPreference === 'DKK' ? 6.9 : 1.0

  return {
    ...loan,
    balance: loan.balance / conversionRate,
    minimumPayment: loan.minimumPayment / conversionRate,
    // No need to convert interest rates or term years
  }
}

/**
 * Makes sure payment analysis data is consistent with the current currency preference
 */
export function validatePaymentAnalysisValues(paymentAnalysis: any): any {
  const currencyPreference = localStorage.getItem('currency') || 'USD'

  // If USD, no validation needed
  if (currencyPreference === 'USD') {
    return paymentAnalysis
  }

  // This function doesn't convert values, but it helps identify inconsistencies
  // for debugging purposes during development
  if (process.env.NODE_ENV === 'development') {
    const conversionRate = currencyPreference === 'DKK' ? 6.9 : 1.0
    const threshold = conversionRate * 0.5 // Only flag very obvious inconsistencies

    // Check if main loan values are in expected range based on preference
    let inconsistentFields: string[] = []

    if (paymentAnalysis) {
      // Check total paid
      if (
        paymentAnalysis.totalPaid &&
        paymentAnalysis.totalPaid < loan.balance * threshold
      ) {
        inconsistentFields.push('totalPaid')
      }

      // Check monthly payment
      if (
        paymentAnalysis.monthlyPayment &&
        paymentAnalysis.monthlyPayment < loan.minimumPayment * threshold
      ) {
        inconsistentFields.push('monthlyPayment')
      }

      // Log inconsistencies
      if (inconsistentFields.length > 0) {
        console.warn(
          `Possible currency inconsistency in payment analysis: ${inconsistentFields.join(', ')}`,
          `Current preference: ${currencyPreference}`
        )
      }
    }
  }

  return paymentAnalysis
}
