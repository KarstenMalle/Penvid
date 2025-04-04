// src/lib/loan-calculations.ts
import { LoanCalculationService } from '@/services/LoanCalculationService'

/**
 * Calculate the time it will take to pay off a loan
 * This uses the client-side calculation from LoanCalculationService
 */
export function calculateLoanTerm(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): { months: number; years: number } {
  return LoanCalculationService.calculateLoanTerm(
    principal,
    annualRate,
    monthlyPayment
  )
}

/**
 * Calculate the total interest paid over the life of a loan
 * This uses the client-side calculation from LoanCalculationService
 */
export function calculateTotalInterestPaid(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number {
  return LoanCalculationService.calculateTotalInterestPaid(
    principal,
    annualRate,
    monthlyPayment
  )
}

/**
 * Calculate monthly payment for a loan
 * This uses the client-side calculation from LoanCalculationService
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  return LoanCalculationService.calculateMonthlyPayment(
    principal,
    annualRate,
    years
  )
}
