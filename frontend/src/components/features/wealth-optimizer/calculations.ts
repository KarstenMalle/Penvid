import {
  Loan,
  YearlyData,
  StrategyResult,
  StrategyResults,
  OptimalStrategy,
  FINANCIAL_CONSTANTS,
  PayoffDetail,
  LoanPayoffDetails,
  InvestmentDetail,
  LoanStrategyComparison,
} from './types'

const { SP500_INFLATION_ADJUSTED_RETURN, COMPARISON_YEARS } =
  FINANCIAL_CONSTANTS

/**
 * Calculates the monthly payment needed to pay off a loan in a given number of years
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
 * Calculates time needed to pay off a loan with a given monthly payment
 */
export const calculateLoanPayoffTime = (
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

  // Calculate payoff time
  const { months } = calculateLoanPayoffTime(
    principal,
    annualRate,
    monthlyPayment
  )

  // Total amount paid
  const totalPaid = monthlyPayment * months

  // Total interest is the difference between total paid and principal
  return Math.max(0, totalPaid - principal)
}

/**
 * Calculates potential investment growth over a period
 */
export const calculateInvestmentGrowth = (
  monthlyContribution: number,
  yearsInvesting: number,
  annualReturnRate: number = SP500_INFLATION_ADJUSTED_RETURN
): number => {
  if (monthlyContribution <= 0 || yearsInvesting <= 0) {
    return 0
  }

  const months = yearsInvesting * 12
  const monthlyRate = annualReturnRate / 100 / 12

  // Formula for future value of periodic payments with compound interest
  const futureValue =
    monthlyContribution *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)

  // Calculate total contributions
  const totalContributions = monthlyContribution * months

  // Return just the interest/growth portion
  return Math.max(0, futureValue - totalContributions)
}

/**
 * Calculates total minimum monthly payment for all loans
 */
export const calculateTotalMinimumPayment = (loans: Loan[]): number => {
  return loans.reduce((total, loan) => total + loan.minimumPayment, 0)
}

/**
 * Calculates remaining money after paying minimums
 */
export const calculateRemainingMoney = (
  monthlyAvailable: number,
  loans: Loan[]
): number => {
  const totalMinimumPayment = calculateTotalMinimumPayment(loans)
  return Math.max(0, monthlyAvailable - totalMinimumPayment)
}

/**
 * Get detailed payoff information for a loan with minimum payments
 */
export const calculateLoanDetailedPayoff = (
  loan: Loan,
  extraPayment: number = 0
): PayoffDetail => {
  const totalPayment = loan.minimumPayment + extraPayment
  const { months, years } = calculateLoanPayoffTime(
    loan.balance,
    loan.interestRate,
    totalPayment
  )

  const totalInterest = calculateTotalInterestPaid(
    loan.balance,
    loan.interestRate,
    totalPayment
  )

  const totalPaid = loan.balance + totalInterest

  return {
    loanId: loan.id,
    loanName: loan.name,
    payoffTimeMonths: months,
    payoffTimeYears: years,
    totalInterestPaid: totalInterest,
    totalPaid: totalPaid,
    monthlyPayment: totalPayment,
    originalLoanAmount: loan.balance,
  }
}

/**
 * Calculate detailed loan comparison for different strategies
 */
export const calculateLoanStrategyComparison = (
  loan: Loan,
  extraMonthlyPayment: number
): LoanStrategyComparison => {
  // Calculate baseline (minimum payment only)
  const baselinePayoff = calculateLoanDetailedPayoff(loan, 0)

  // Calculate with extra payment
  const acceleratedPayoff = calculateLoanDetailedPayoff(
    loan,
    extraMonthlyPayment
  )

  // Calculate potential investment growth if extra payment was invested instead
  const potentialInvestmentGrowth = calculateInvestmentGrowth(
    extraMonthlyPayment,
    baselinePayoff.payoffTimeYears,
    SP500_INFLATION_ADJUSTED_RETURN
  )

  // Calculate interest saved by paying early
  const interestSaved =
    baselinePayoff.totalInterestPaid - acceleratedPayoff.totalInterestPaid

  // Determine if paying down is better than investing
  const payingDownIsBetter = interestSaved > potentialInvestmentGrowth

  return {
    loanId: loan.id,
    loanName: loan.name,
    interestRate: loan.interestRate,
    originalBalance: loan.balance,
    minimumPayment: loan.minimumPayment,
    baselinePayoff,
    acceleratedPayoff,
    extraMonthlyPayment,
    interestSaved,
    potentialInvestmentGrowth,
    payingDownIsBetter,
    netAdvantage: payingDownIsBetter
      ? interestSaved - potentialInvestmentGrowth
      : potentialInvestmentGrowth - interestSaved,
    betterStrategy: payingDownIsBetter
      ? 'Pay Down Loan'
      : 'Minimum Payment + Invest',
  }
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
  const loanPayoffDetails: LoanPayoffDetails = {}
  const investmentDetails: InvestmentDetail[] = []

  // Calculate loan payoff details for each loan
  loans.forEach((loan) => {
    loanPayoffDetails[loan.id] = calculateLoanDetailedPayoff(loan, 0)
  })

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

    // Track investment for the year
    let yearlyInvestment = 0

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
      yearlyInvestment += remainingMoney
    }

    // Track yearly investment details
    investmentDetails.push({
      year,
      amount: yearlyInvestment,
      totalValue: investmentValue,
    })

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
    loanPayoffDetails,
    investmentDetails,
    strategyName: 'Minimum Payments + Invest',
    strategyDescription:
      'Pay only the minimum required payments on all loans and invest the rest in the S&P 500.',
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
  const loanPayoffDetails: LoanPayoffDetails = {}
  const investmentDetails: InvestmentDetail[] = []
  const extraPayments: Record<number, number> = {}

  // Default extra payment is 0 - will be calculated during simulation
  loans.forEach((loan) => {
    extraPayments[loan.id] = 0
  })

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

    // Track investment for the year
    let yearlyInvestment = 0

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

          // Track extra payments for this loan (for the first year)
          if (year === 1 && month === 1) {
            extraPayments[currentLoans[i].id] = payment
          }
        }
      }

      // If all loans are paid off, invest the remaining money
      if (
        currentLoans.every((loan) => loan.balance <= 0) &&
        extraPaymentAvailable > 0
      ) {
        investmentValue += extraPaymentAvailable
        yearlyInvestment += extraPaymentAvailable
      }

      // Grow existing investments
      investmentValue *= 1 + SP500_INFLATION_ADJUSTED_RETURN / 100 / 12
    }

    // Track yearly investment details
    investmentDetails.push({
      year,
      amount: yearlyInvestment,
      totalValue: investmentValue,
    })

    // Record end of year values
    yearSummary.investmentValue = investmentValue
    yearSummary.loanBalance = currentLoans.reduce(
      (sum, loan) => sum + loan.balance,
      0
    )
    yearSummary.netWorth = yearSummary.investmentValue - yearSummary.loanBalance
    yearlyData.push(yearSummary)
  }

  // Calculate loan payoff details for each loan
  loans.forEach((loan) => {
    loanPayoffDetails[loan.id] = calculateLoanDetailedPayoff(
      loan,
      extraPayments[loan.id]
    )
  })

  return {
    yearlyData,
    finalNetWorth: yearlyData[COMPARISON_YEARS].netWorth,
    totalInterestPaid: totalInterest,
    loanPayoffDetails,
    investmentDetails,
    strategyName: 'Debt Avalanche',
    strategyDescription:
      'Pay minimum on all loans, but put any extra money toward the highest interest loan first. Once paid off, move to the next highest interest loan. Invest only after all loans are paid off.',
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
  const loanPayoffDetails: LoanPayoffDetails = {}
  const investmentDetails: InvestmentDetail[] = []
  const extraPayments: Record<number, number> = {}

  // Default extra payment is 0 - will be calculated during simulation
  loans.forEach((loan) => {
    extraPayments[loan.id] = 0
  })

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

    // Track investment for the year
    let yearlyInvestment = 0

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

            // Track extra payments for this loan (for the first year)
            if (year === 1 && month === 1) {
              extraPayments[currentLoans[i].id] = payment
            }
          }
        }
      }

      // Invest any money left after paying high interest loans
      if (extraPaymentAvailable > 0) {
        investmentValue += extraPaymentAvailable
        yearlyInvestment += extraPaymentAvailable
      }

      // Grow existing investments
      investmentValue *= 1 + SP500_INFLATION_ADJUSTED_RETURN / 100 / 12
    }

    // Track yearly investment details
    investmentDetails.push({
      year,
      amount: yearlyInvestment,
      totalValue: investmentValue,
    })

    // Record end of year values
    yearSummary.investmentValue = investmentValue
    yearSummary.loanBalance = currentLoans.reduce(
      (sum, loan) => sum + loan.balance,
      0
    )
    yearSummary.netWorth = yearSummary.investmentValue - yearSummary.loanBalance
    yearlyData.push(yearSummary)
  }

  // Calculate loan payoff details for each loan
  loans.forEach((loan) => {
    const extraPayment = isHighInterest(loan.interestRate)
      ? extraPayments[loan.id]
      : 0

    loanPayoffDetails[loan.id] = calculateLoanDetailedPayoff(loan, extraPayment)
  })

  return {
    yearlyData,
    finalNetWorth: yearlyData[COMPARISON_YEARS].netWorth,
    totalInterestPaid: totalInterest,
    loanPayoffDetails,
    investmentDetails,
    strategyName: 'Hybrid Approach',
    strategyDescription: `Pay off only loans with interest rates higher than the S&P 500's inflation-adjusted return (${SP500_INFLATION_ADJUSTED_RETURN}%), and invest the rest.`,
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
  const loanPayoffDetails: LoanPayoffDetails = {}
  const investmentDetails: InvestmentDetail[] = []
  const extraPayments: Record<number, number> = {}

  // Default extra payment is 0 - will be calculated during simulation
  loans.forEach((loan) => {
    extraPayments[loan.id] = 0
  })

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

    // Track investment for the year
    let yearlyInvestment = 0

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

            // Track extra payments for this loan (for the first year)
            if (year === 1 && month === 1) {
              extraPayments[currentLoans[i].id] = payment
            }
          }
        }
      }

      // After 5 years, invest everything extra
      if (year > 5 && extraPaymentAvailable > 0) {
        investmentValue += extraPaymentAvailable
        yearlyInvestment += extraPaymentAvailable
      }

      // Grow existing investments
      investmentValue *= 1 + SP500_INFLATION_ADJUSTED_RETURN / 100 / 12
    }

    // Track yearly investment details
    investmentDetails.push({
      year,
      amount: yearlyInvestment,
      totalValue: investmentValue,
    })

    // Record end of year values
    yearSummary.investmentValue = investmentValue
    yearSummary.loanBalance = currentLoans.reduce(
      (sum, loan) => sum + loan.balance,
      0
    )
    yearSummary.netWorth = yearSummary.investmentValue - yearSummary.loanBalance
    yearlyData.push(yearSummary)
  }

  // Calculate loan payoff details for each loan
  loans.forEach((loan) => {
    loanPayoffDetails[loan.id] = calculateLoanDetailedPayoff(
      loan,
      extraPayments[loan.id]
    )
  })

  return {
    yearlyData,
    finalNetWorth: yearlyData[COMPARISON_YEARS].netWorth,
    totalInterestPaid: totalInterest,
    loanPayoffDetails,
    investmentDetails,
    strategyName: '5-Year Aggressive Paydown',
    strategyDescription:
      'Aggressively pay down all loans for the first 5 years (focusing on high-interest loans first), then switch to investing all extra money after that.',
  }
}

/**
 * For each loan, calculate whether paying down or investing is better
 */
export const calculateLoanWiseComparisons = (
  loans: Loan[],
  monthlyAvailable: number
): LoanStrategyComparison[] => {
  const remainingMoney = calculateRemainingMoney(monthlyAvailable, loans)

  // If there's no extra money available, return empty comparisons
  if (remainingMoney <= 0) {
    return []
  }

  // Calculate how much extra money to allocate to each loan
  const comparisons: LoanStrategyComparison[] = []

  // Sort loans by interest rate (highest first)
  const sortedLoans = [...loans].sort((a, b) => b.interestRate - a.interestRate)

  // For each loan, calculate comparison if all extra money went to it
  sortedLoans.forEach((loan) => {
    const comparison = calculateLoanStrategyComparison(loan, remainingMoney)
    comparisons.push(comparison)
  })

  return comparisons
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
  loanComparisons: LoanStrategyComparison[]
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

  // Calculate loan-wise comparisons for clearer explanation
  const loanComparisons = calculateLoanWiseComparisons(loans, monthlyAvailable)

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
      description: strategies[bestStrategy].strategyDescription,
      netWorthDifference,
    },
    loanComparisons,
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

/**
 * Format years and months for display
 */
export const formatTimeSpan = (months: number): string => {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
  } else if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  } else {
    return `${years} year${years !== 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
  }
}
