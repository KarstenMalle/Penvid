/**
 * Utility functions for loan calculations
 */

/**
 * Calculates the monthly payment needed to pay off a loan in a given number of years
 */
export const calculateMonthlyPayment = (
  principal: number,
  annualRate: number,
  years: number
): number => {
  if (principal <= 0 || years <= 0) return 0

  const monthlyRate = annualRate / 100 / 12
  const numPayments = years * 12

  if (monthlyRate === 0) return principal / numPayments

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  )
}

/**
 * Calculates time needed to pay off a loan with a given monthly payment
 * Returns both months and years
 */
export const calculateLoanTerm = (
  principal: number,
  annualRate: number,
  monthlyPayment: number
): { months: number; years: number } => {
  // If loan amount is 0 or payment is 0
  if (principal <= 0 || monthlyPayment <= 0) {
    return { months: 0, years: 0 }
  }

  const monthlyRate = annualRate / 100 / 12

  // If interest rate is 0, simple division
  if (monthlyRate === 0) {
    const months = Math.ceil(principal / monthlyPayment)
    return {
      months: months,
      years: Math.floor(months / 12),
    }
  }

  // For interest-bearing loans, use the formula:
  // n = -log(1 - P*r/PMT) / log(1 + r)
  // where n is number of payments, P is principal, r is monthly rate, PMT is payment

  // Check if payment covers interest
  if (monthlyPayment <= principal * monthlyRate) {
    return { months: Infinity, years: Infinity }
  }

  const n =
    -Math.log(1 - (principal * monthlyRate) / monthlyPayment) /
    Math.log(1 + monthlyRate)
  const months = Math.ceil(n)

  return {
    months: months,
    years: Math.floor(months / 12),
  }
}

/**
 * Calculates total interest paid on a loan
 */
export const calculateTotalInterestPaid = (
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number => {
  if (principal <= 0 || monthlyPayment <= 0) {
    return 0
  }

  const monthlyRate = annualRate / 100 / 12

  // If interest rate is 0, no interest is paid
  if (monthlyRate === 0) {
    return 0
  }

  // If payment doesn't cover interest
  if (monthlyPayment <= principal * monthlyRate) {
    return Infinity
  }

  // Calculate payoff time
  const { months } = calculateLoanTerm(principal, annualRate, monthlyPayment)

  if (!isFinite(months)) {
    return Infinity
  }

  // Total amount paid
  const totalPaid = monthlyPayment * months

  // Total interest is the difference between total paid and principal
  return Math.max(0, totalPaid - principal)
}

/**
 * Generates an amortization schedule for a loan
 */
export const generateAmortizationSchedule = (
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  maxYears: number = 30
): Array<{
  paymentNumber: number
  date: string
  payment: number
  principal: number
  interest: number
  balance: number
}> => {
  const schedule = []
  const monthlyRate = annualRate / 100 / 12
  let balance = principal
  let paymentNumber = 1
  const startDate = new Date()

  // Maximum number of payments to prevent infinite loops
  const maxPayments = maxYears * 12

  while (balance > 0 && paymentNumber <= maxPayments) {
    const interestPayment = balance * monthlyRate
    const principalPayment = Math.min(monthlyPayment - interestPayment, balance)

    // If payment doesn't cover interest, break to avoid infinite loop
    if (monthlyPayment <= interestPayment) {
      break
    }

    // Calculate date for this payment
    const paymentDate = new Date(startDate)
    paymentDate.setMonth(startDate.getMonth() + paymentNumber - 1)

    // Add payment to schedule
    schedule.push({
      paymentNumber,
      date: paymentDate.toISOString().split('T')[0],
      payment: principalPayment + interestPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: balance - principalPayment,
    })

    // Update balance for next iteration
    balance -= principalPayment
    paymentNumber++

    // Break if balance is very close to zero to avoid floating point issues
    if (balance < 0.01) {
      balance = 0
    }
  }

  return schedule
}

/**
 * Format currency for display
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
 * Format percentage for display
 */
export const formatPercent = (percent: number): string => {
  if (!isFinite(percent)) {
    return 'N/A'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100)
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

/**
 * Calculates the amount of a one-time extra payment needed to pay off a loan by a specific date
 */
export const calculateExtraPaymentForTargetDate = (
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  targetDate: Date
): number => {
  const monthlyRate = annualRate / 100 / 12
  const now = new Date()

  // Calculate months between now and target date
  const monthsDiff =
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
    (targetDate.getMonth() - now.getMonth())

  if (monthsDiff <= 0) {
    return principal // If target date is in the past, return full balance
  }

  // If interest rate is 0, simple calculation
  if (monthlyRate === 0) {
    const totalNeeded = principal
    const regularPayments = monthlyPayment * monthsDiff
    return Math.max(0, totalNeeded - regularPayments)
  }

  // Calculate the balance after making regular payments until the target date
  let remainingBalance = principal

  for (let i = 0; i < monthsDiff; i++) {
    const interest = remainingBalance * monthlyRate
    const principalPaid = Math.min(monthlyPayment - interest, remainingBalance)
    remainingBalance = remainingBalance - principalPaid

    if (remainingBalance <= 0) {
      return 0 // Loan will be paid off with regular payments
    }
  }

  // Extra payment needed is the remaining balance
  return remainingBalance
}

/**
 * Calculates the impact of making extra payments on a loan
 */
export const calculateExtraPaymentImpact = (
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  extraMonthlyPayment: number
): {
  originalTerm: { months: number; years: number }
  newTerm: { months: number; years: number }
  monthsSaved: number
  interestSaved: number
} => {
  // Calculate original term
  const originalTerm = calculateLoanTerm(principal, annualRate, monthlyPayment)

  // Calculate new term with extra payment
  const newTerm = calculateLoanTerm(
    principal,
    annualRate,
    monthlyPayment + extraMonthlyPayment
  )

  // Calculate months saved
  const monthsSaved = Math.max(0, originalTerm.months - newTerm.months)

  // Calculate interest saved
  const originalInterest = calculateTotalInterestPaid(
    principal,
    annualRate,
    monthlyPayment
  )

  const newInterest = calculateTotalInterestPaid(
    principal,
    annualRate,
    monthlyPayment + extraMonthlyPayment
  )

  const interestSaved = Math.max(0, originalInterest - newInterest)

  return {
    originalTerm,
    newTerm,
    monthsSaved,
    interestSaved,
  }
}
