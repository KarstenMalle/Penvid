import {
  Loan,
  YearlyData,
  StrategyResult,
  StrategyResults,
  OptimalStrategy,
  FINANCIAL_CONSTANTS,
} from './types'
import { useLocalization } from '@/context/LocalizationContext'

const { SP500_INFLATION_ADJUSTED_RETURN, COMPARISON_YEARS } =
  FINANCIAL_CONSTANTS

/**
 * Calculates the monthly payment required to pay off a loan in a given term
 */
export const calculateMonthlyPayment = (
  principal: number,
  annualRate: number,
  years: number
): number => {
  const monthlyRate = annualRate / 100 / 12
  const numPayments = years * 12

  if (monthlyRate === 0) return principal / numPayments

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  )
}

/**
 * Calculates total minimum monthly payment for all loans
 */
export const calculateTotalMinimumPayment = (loans: Loan[]): number => {
  return loans.reduce((total, loan) => total + loan.minimumPayment, 0)
}

/**
 * Calculates remaining money after paying minimum payments
 */
export const calculateRemainingMoney = (
  monthlyAvailable: number,
  loans: Loan[]
): number => {
  const totalMinimumPayment = calculateTotalMinimumPayment(loans)
  return Math.max(0, monthlyAvailable - totalMinimumPayment)
}

/**
 * Strategy 1: Pay minimum on all loans, invest the rest
 */
export const calculateMinimumPaymentStrategy = (
  loans: Loan[],
  monthlyAvailable: number
): StrategyResult => {
  const remainingMoney = calculateRemainingMoney(monthlyAvailable, loans)
  const yearlyData: YearlyData[] = []

  // Deep clone loans to avoid modifying original state
  let currentLoans = JSON.parse(JSON.stringify(loans)) as Loan[]
  let investmentValue = 0
  let totalInterest = 0

  for (let year = 0; year <= COMPARISON_YEARS; year++) {
    const yearSummary: YearlyData = {
      year,
      investmentValue: 0,
      loanBalance: 0,
      netWorth: 0,
    }

    // Start with initial values in year 0
    if (year === 0) {
      yearSummary.investmentValue = 0
      yearSummary.loanBalance = currentLoans.reduce(
        (sum, loan) => sum + loan.balance,
        0
      )
      yearSummary.netWorth = -yearSummary.loanBalance
      yearlyData.push(yearSummary)
      continue
    }

    // Process a full year
    for (let month = 1; month <= 12; month++) {
      // Apply minimum payments and track interest
      currentLoans = currentLoans.map((loan) => {
        if (loan.balance <= 0) return { ...loan, balance: 0 }

        const monthlyRate = loan.interestRate / 100 / 12
        const interestThisMonth = loan.balance * monthlyRate
        totalInterest += interestThisMonth

        const newBalance =
          loan.balance + interestThisMonth - loan.minimumPayment
        return { ...loan, balance: Math.max(0, newBalance) }
      })

      // Invest the remaining money
      investmentValue *= 1 + SP500_INFLATION_ADJUSTED_RETURN / 100 / 12
      investmentValue += remainingMoney
    }

    // Record end of year values
    yearSummary.investmentValue = investmentValue
    yearSummary.loanBalance = currentLoans.reduce(
      (sum, loan) => sum + loan.balance,
      0
    )
    yearSummary.netWorth = yearSummary.investmentValue - yearSummary.loanBalance
    yearlyData.push(yearSummary)
  }

  return {
    yearlyData,
    finalNetWorth: yearlyData[COMPARISON_YEARS].netWorth,
    totalInterestPaid: totalInterest,
  }
}

/**
 * Strategy 2: Pay down highest interest loan first (debt avalanche), then invest
 */
export const calculateAvalancheStrategy = (
  loans: Loan[],
  monthlyAvailable: number
): StrategyResult => {
  let remainingMoney = calculateRemainingMoney(monthlyAvailable, loans)
  const yearlyData: YearlyData[] = []

  // Deep clone loans to avoid modifying original state
  let currentLoans = JSON.parse(JSON.stringify(loans)) as Loan[]
  let investmentValue = 0
  let totalInterest = 0

  for (let year = 0; year <= COMPARISON_YEARS; year++) {
    const yearSummary: YearlyData = {
      year,
      investmentValue: 0,
      loanBalance: 0,
      netWorth: 0,
    }

    // Start with initial values in year 0
    if (year === 0) {
      yearSummary.investmentValue = 0
      yearSummary.loanBalance = currentLoans.reduce(
        (sum, loan) => sum + loan.balance,
        0
      )
      yearSummary.netWorth = -yearSummary.loanBalance
      yearlyData.push(yearSummary)
      continue
    }

    // Process a full year
    for (let month = 1; month <= 12; month++) {
      // First pay minimums on all loans and track interest
      currentLoans = currentLoans.map((loan) => {
        if (loan.balance <= 0) return { ...loan, balance: 0 }

        const monthlyRate = loan.interestRate / 100 / 12
        const interestThisMonth = loan.balance * monthlyRate
        totalInterest += interestThisMonth

        const newBalance =
          loan.balance + interestThisMonth - loan.minimumPayment
        return { ...loan, balance: Math.max(0, newBalance) }
      })

      // Sort loans by interest rate (highest first)
      currentLoans.sort((a, b) => b.interestRate - a.interestRate)

      // Apply remaining money to highest interest loan
      let extraPaymentAvailable = remainingMoney
      for (
        let i = 0;
        i < currentLoans.length && extraPaymentAvailable > 0;
        i++
      ) {
        if (currentLoans[i].balance > 0) {
          const payment = Math.min(
            extraPaymentAvailable,
            currentLoans[i].balance
          )
          currentLoans[i].balance -= payment
          extraPaymentAvailable -= payment
        }
      }

      // If all loans are paid off, invest the remaining money
      if (
        currentLoans.every((loan) => loan.balance <= 0) &&
        extraPaymentAvailable > 0
      ) {
        investmentValue += extraPaymentAvailable
      }

      // Grow existing investments
      investmentValue *= 1 + SP500_INFLATION_ADJUSTED_RETURN / 100 / 12
    }

    // Record end of year values
    yearSummary.investmentValue = investmentValue
    yearSummary.loanBalance = currentLoans.reduce(
      (sum, loan) => sum + loan.balance,
      0
    )
    yearSummary.netWorth = yearSummary.investmentValue - yearSummary.loanBalance
    yearlyData.push(yearSummary)
  }

  return {
    yearlyData,
    finalNetWorth: yearlyData[COMPARISON_YEARS].netWorth,
    totalInterestPaid: totalInterest,
  }
}

/**
 * Strategy 3: Hybrid - first pay down high-interest loans (above S&P return), then invest
 */
export const calculateHybridStrategy = (
  loans: Loan[],
  monthlyAvailable: number
): StrategyResult => {
  let remainingMoney = calculateRemainingMoney(monthlyAvailable, loans)
  const yearlyData: YearlyData[] = []

  // Deep clone loans to avoid modifying original state
  let currentLoans = JSON.parse(JSON.stringify(loans)) as Loan[]
  let investmentValue = 0
  let totalInterest = 0

  // Identify whether a loan is high interest (above S&P return)
  const isHighInterest = (interestRate: number) =>
    interestRate > SP500_INFLATION_ADJUSTED_RETURN

  for (let year = 0; year <= COMPARISON_YEARS; year++) {
    const yearSummary: YearlyData = {
      year,
      investmentValue: 0,
      loanBalance: 0,
      netWorth: 0,
    }

    // Start with initial values in year 0
    if (year === 0) {
      yearSummary.investmentValue = 0
      yearSummary.loanBalance = currentLoans.reduce(
        (sum, loan) => sum + loan.balance,
        0
      )
      yearSummary.netWorth = -yearSummary.loanBalance
      yearlyData.push(yearSummary)
      continue
    }

    // Process a full year
    for (let month = 1; month <= 12; month++) {
      // First pay minimums on all loans and track interest
      currentLoans = currentLoans.map((loan) => {
        if (loan.balance <= 0) return { ...loan, balance: 0 }

        const monthlyRate = loan.interestRate / 100 / 12
        const interestThisMonth = loan.balance * monthlyRate
        totalInterest += interestThisMonth

        const newBalance =
          loan.balance + interestThisMonth - loan.minimumPayment
        return { ...loan, balance: Math.max(0, newBalance) }
      })

      // Determine available money for allocation
      let extraPaymentAvailable = remainingMoney

      // Prioritize high interest loans
      if (
        currentLoans.some(
          (loan) => loan.balance > 0 && isHighInterest(loan.interestRate)
        )
      ) {
        // Sort loans by interest rate (highest first)
        currentLoans.sort((a, b) => b.interestRate - a.interestRate)

        // Apply remaining money to highest interest loans (above S&P return)
        for (
          let i = 0;
          i < currentLoans.length && extraPaymentAvailable > 0;
          i++
        ) {
          if (
            currentLoans[i].balance > 0 &&
            isHighInterest(currentLoans[i].interestRate)
          ) {
            const payment = Math.min(
              extraPaymentAvailable,
              currentLoans[i].balance
            )
            currentLoans[i].balance -= payment
            extraPaymentAvailable -= payment
          }
        }
      }

      // Invest any money left after paying high interest loans
      if (extraPaymentAvailable > 0) {
        investmentValue += extraPaymentAvailable
      }

      // Grow existing investments
      investmentValue *= 1 + SP500_INFLATION_ADJUSTED_RETURN / 100 / 12
    }

    // Record end of year values
    yearSummary.investmentValue = investmentValue
    yearSummary.loanBalance = currentLoans.reduce(
      (sum, loan) => sum + loan.balance,
      0
    )
    yearSummary.netWorth = yearSummary.investmentValue - yearSummary.loanBalance
    yearlyData.push(yearSummary)
  }

  return {
    yearlyData,
    finalNetWorth: yearlyData[COMPARISON_YEARS].netWorth,
    totalInterestPaid: totalInterest,
  }
}

/**
 * Strategy 4: Custom (5 years aggressive paydown, then invest)
 */
export const calculateCustomStrategy = (
  loans: Loan[],
  monthlyAvailable: number
): StrategyResult => {
  let remainingMoney = calculateRemainingMoney(monthlyAvailable, loans)
  const yearlyData: YearlyData[] = []

  // Deep clone loans to avoid modifying original state
  let currentLoans = JSON.parse(JSON.stringify(loans)) as Loan[]
  let investmentValue = 0
  let totalInterest = 0

  for (let year = 0; year <= COMPARISON_YEARS; year++) {
    const yearSummary: YearlyData = {
      year,
      investmentValue: 0,
      loanBalance: 0,
      netWorth: 0,
    }

    // Start with initial values in year 0
    if (year === 0) {
      yearSummary.investmentValue = 0
      yearSummary.loanBalance = currentLoans.reduce(
        (sum, loan) => sum + loan.balance,
        0
      )
      yearSummary.netWorth = -yearSummary.loanBalance
      yearlyData.push(yearSummary)
      continue
    }

    // Process a full year
    for (let month = 1; month <= 12; month++) {
      // First pay minimums on all loans and track interest
      currentLoans = currentLoans.map((loan) => {
        if (loan.balance <= 0) return { ...loan, balance: 0 }

        const monthlyRate = loan.interestRate / 100 / 12
        const interestThisMonth = loan.balance * monthlyRate
        totalInterest += interestThisMonth

        const newBalance =
          loan.balance + interestThisMonth - loan.minimumPayment
        return { ...loan, balance: Math.max(0, newBalance) }
      })

      // Determine available money for allocation
      let extraPaymentAvailable = remainingMoney

      // For first 5 years, pay down all loans aggressively (starting with highest interest)
      if (year <= 5) {
        // Sort loans by interest rate (highest first)
        currentLoans.sort((a, b) => b.interestRate - a.interestRate)

        // Apply remaining money to loans
        for (
          let i = 0;
          i < currentLoans.length && extraPaymentAvailable > 0;
          i++
        ) {
          if (currentLoans[i].balance > 0) {
            const payment = Math.min(
              extraPaymentAvailable,
              currentLoans[i].balance
            )
            currentLoans[i].balance -= payment
            extraPaymentAvailable -= payment
          }
        }
      }

      // After 5 years, invest everything extra
      if (year > 5 && extraPaymentAvailable > 0) {
        investmentValue += extraPaymentAvailable
      }

      // Grow existing investments
      investmentValue *= 1 + SP500_INFLATION_ADJUSTED_RETURN / 100 / 12
    }

    // Record end of year values
    yearSummary.investmentValue = investmentValue
    yearSummary.loanBalance = currentLoans.reduce(
      (sum, loan) => sum + loan.balance,
      0
    )
    yearSummary.netWorth = yearSummary.investmentValue - yearSummary.loanBalance
    yearlyData.push(yearSummary)
  }

  return {
    yearlyData,
    finalNetWorth: yearlyData[COMPARISON_YEARS].netWorth,
    totalInterestPaid: totalInterest,
  }
}

/**
 * Calculates all strategies and determines the optimal one
 */
export const calculateAllStrategies = (
  loans: Loan[],
  monthlyAvailable: number
): {
  strategies: StrategyResults
  optimal: OptimalStrategy
} => {
  // Calculate different strategies
  const strategies: StrategyResults = {
    'Minimum Payments + Invest': calculateMinimumPaymentStrategy(
      loans,
      monthlyAvailable
    ),
    'Debt Avalanche': calculateAvalancheStrategy(loans, monthlyAvailable),
    'Hybrid Approach': calculateHybridStrategy(loans, monthlyAvailable),
    '5-Year Aggressive Paydown': calculateCustomStrategy(
      loans,
      monthlyAvailable
    ),
  }

  // Determine optimal strategy
  const bestStrategy = Object.keys(strategies).reduce((best, current) => {
    return strategies[current].finalNetWorth > strategies[best].finalNetWorth
      ? current
      : best
  }, Object.keys(strategies)[0])

  // Calculate difference between strategies
  const netWorthDifference: { [key: string]: number } = {}
  Object.keys(strategies).forEach((strategyName) => {
    if (strategyName !== bestStrategy) {
      netWorthDifference[strategyName] =
        ((strategies[bestStrategy].finalNetWorth -
          strategies[strategyName].finalNetWorth) /
          Math.abs(strategies[strategyName].finalNetWorth)) *
        100
    }
  })

  return {
    strategies,
    optimal: {
      name: bestStrategy,
      netWorthDifference,
    },
  }
}

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
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
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100)
}
