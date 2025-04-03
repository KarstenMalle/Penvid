# backend/app/services/wealth_optimizer.py
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from ..calculations import calculate_monthly_payment, generate_amortization_schedule, calculate_investment_projection
from pydantic import BaseModel

# Define constants
SP500_AVERAGE_RETURN = 10.06  # Average historical return (%)
SP500_INFLATION_ADJUSTED_RETURN = 6.78  # Inflation-adjusted return (%)
COMPARISON_YEARS = 30  # How many years to project for comparison

class LoanInput(BaseModel):
    id: int
    name: str
    balance: float
    interestRate: float
    termYears: float
    minimumPayment: float
    loanType: Optional[str] = "OTHER"

class WealthOptimizerService:
    @staticmethod
    def calculate_loan_comparisons(loans: List[Dict[str, Any]], monthly_surplus: float, risk_factor: float = 0.7) -> List[Dict[str, Any]]:
        """Calculate loan-by-loan comparisons for each loan in the list"""
        comparisons = []

        for loan in loans:
            # Extract loan details
            loan_id = loan.get('id')
            loan_name = loan.get('name', f'Loan {loan_id}')
            principal = loan.get('balance', 0)
            interest_rate = loan.get('interestRate', 0) / 100  # Convert percentage to decimal
            minimum_payment = loan.get('minimumPayment', 0)

            # Skip invalid loans
            if principal <= 0 or interest_rate <= 0 or minimum_payment <= 0:
                continue

            # Calculate baseline amortization (minimum payments only)
            baseline_amortization = generate_amortization_schedule(
                principal=principal,
                annual_rate=interest_rate,
                monthly_payment=minimum_payment
            )

            # Calculate accelerated amortization (with extra payments)
            accelerated_amortization = generate_amortization_schedule(
                principal=principal,
                annual_rate=interest_rate,
                monthly_payment=minimum_payment,
                extra_payment=monthly_surplus
            )

            # Calculate interest savings
            interest_savings = baseline_amortization['total_interest_paid'] - accelerated_amortization['total_interest_paid']

            # Calculate time savings
            months_saved = baseline_amortization['months_to_payoff'] - accelerated_amortization['months_to_payoff']

            # Calculate investment growth if investing the extra money
            # (for the same time period as the accelerated payoff)
            short_term_investment = calculate_investment_projection(
                monthly_amount=monthly_surplus,
                annual_return=SP500_INFLATION_ADJUSTED_RETURN / 100,
                months=accelerated_amortization['months_to_payoff'],
            )

            # Calculate full-term investment growth
            long_term_investment = calculate_investment_projection(
                monthly_amount=monthly_surplus,
                annual_return=SP500_INFLATION_ADJUSTED_RETURN / 100,
                months=baseline_amortization['months_to_payoff'],
            )

            # Calculate investment after accelerated payoff
            remaining_months = baseline_amortization['months_to_payoff'] - accelerated_amortization['months_to_payoff']
            if remaining_months > 0:
                after_payoff_investment = calculate_investment_projection(
                    monthly_amount=minimum_payment + monthly_surplus,
                    annual_return=SP500_INFLATION_ADJUSTED_RETURN / 100,
                    months=remaining_months,
                )
                accelerated_strategy_value = after_payoff_investment['risk_adjusted_balance']
            else:
                accelerated_strategy_value = 0

            # Apply risk adjustment to investment returns
            risk_adjusted_growth = short_term_investment['risk_adjusted_balance']

            # Compare strategies - is paying down better than investing?
            paying_down_better = interest_savings > risk_adjusted_growth

            # Create comparison result
            comparison = {
                "loanId": loan_id,
                "loanName": loan_name,
                "interestRate": interest_rate * 100,  # Convert back to percentage
                "originalBalance": principal,
                "minimumPayment": minimum_payment,
                "baselinePayoff": {
                    "payoffTimeMonths": baseline_amortization['months_to_payoff'],
                    "payoffTimeYears": baseline_amortization['months_to_payoff'] / 12,
                    "totalInterestPaid": baseline_amortization['total_interest_paid'],
                    "totalPaid": principal + baseline_amortization['total_interest_paid']
                },
                "acceleratedPayoff": {
                    "payoffTimeMonths": accelerated_amortization['months_to_payoff'],
                    "payoffTimeYears": accelerated_amortization['months_to_payoff'] / 12,
                    "totalInterestPaid": accelerated_amortization['total_interest_paid'],
                    "totalPaid": principal + accelerated_amortization['total_interest_paid']
                },
                "extraMonthlyPayment": monthly_surplus,
                "interestSaved": interest_savings,
                "potentialInvestmentGrowth": short_term_investment['final_balance'],
                "longTermInvestmentGrowth": long_term_investment['final_balance'],
                "acceleratedStrategyTotalValue": accelerated_strategy_value,
                "payingDownIsBetter": paying_down_better,
                "netAdvantage": abs(interest_savings - risk_adjusted_growth),
                "betterStrategy": "pay-down" if paying_down_better else "invest",
                "fullTermComparison": {
                    "investingOnlyNetWorth": long_term_investment['risk_adjusted_balance'] - baseline_amortization['total_interest_paid'],
                    "acceleratedStrategyNetWorth": accelerated_strategy_value - accelerated_amortization['total_interest_paid'],
                    "isBetter": (accelerated_strategy_value - accelerated_amortization['total_interest_paid']) >
                                (long_term_investment['risk_adjusted_balance'] - baseline_amortization['total_interest_paid'])
                }
            }

            comparisons.append(comparison)

        return comparisons

    @staticmethod
    def calculate_strategy_results(loans: List[Dict[str, Any]], monthly_budget: float) -> Dict[str, Any]:
        """Calculate and compare different debt payment strategies"""
        # Define the strategies to compare
        strategies = {
            "Minimum Payments + Invest": {
                "description": "Pay only the minimum required payments on all loans and invest the rest in the S&P 500.",
                "function": WealthOptimizerService._calculate_minimum_payments_invest_strategy
            },
            "Debt Avalanche": {
                "description": "Pay minimum on all loans, but put any extra money toward the highest interest loan first. Once paid off, move to the next highest interest loan. Invest only after all loans are paid off.",
                "function": WealthOptimizerService._calculate_debt_avalanche_strategy
            },
            "Hybrid Approach": {
                "description": f"Pay off only loans with interest rates higher than the S&P 500's inflation-adjusted return ({SP500_INFLATION_ADJUSTED_RETURN}%), and invest the rest.",
                "function": WealthOptimizerService._calculate_hybrid_strategy
            },
            "5-Year Aggressive Paydown": {
                "description": "Aggressively pay down all loans for the first 5 years (focusing on high-interest loans first), then switch to investing all extra money after that.",
                "function": WealthOptimizerService._calculate_aggressive_paydown_strategy
            }
        }

        # Calculate results for each strategy
        strategy_results = {}
        for name, strategy in strategies.items():
            result = strategy["function"](loans, monthly_budget)
            result["strategyName"] = name
            result["strategyDescription"] = strategy["description"]
            strategy_results[name] = result

        # Determine optimal strategy based on final net worth
        optimal_strategy = max(strategy_results.items(), key=lambda x: x[1]["finalNetWorth"])

        # Calculate differences between optimal and other strategies
        net_worth_difference = {}
        for name, result in strategy_results.items():
            if name != optimal_strategy[0]:
                # Calculate percentage difference
                difference = ((optimal_strategy[1]["finalNetWorth"] - result["finalNetWorth"]) /
                              abs(result["finalNetWorth"])) * 100
                net_worth_difference[name] = difference

        # Generate yearly data for charts
        yearly_data = []
        for year in range(COMPARISON_YEARS + 1):
            data_point = {"year": year}
            for name, result in strategy_results.items():
                # Find the data point for this year
                year_data = next((d for d in result["yearlyData"] if d["year"] == year), None)
                if year_data:
                    data_point[name] = year_data["netWorth"]
                else:
                    data_point[name] = 0
            yearly_data.append(data_point)

        # Extract total interest paid and investment values for comparison
        total_interest_paid = {name: result["totalInterestPaid"] for name, result in strategy_results.items()}

        # Extract total investment value at the end
        total_investment_value = {}
        for name, result in strategy_results.items():
            investments = result["investmentDetails"]
            if investments:
                total_investment_value[name] = investments[-1]["totalValue"]
            else:
                total_investment_value[name] = 0

        # Format the recommendation
        recommendation = {
            "name": optimal_strategy[0],
            "description": optimal_strategy[1]["strategyDescription"],
            "netWorthDifference": net_worth_difference
        }

        return {
            "recommendation": recommendation,
            "results": strategy_results,
            "yearByYearData": yearly_data,
            "totalInterestPaid": total_interest_paid,
            "totalInvestmentValue": total_investment_value
        }

    # Implement strategy calculation functions
    @staticmethod
    def _calculate_minimum_payments_invest_strategy(loans: List[Dict[str, Any]], monthly_budget: float) -> Dict[str, Any]:
        """
        Calculate results for "Minimum Payments + Invest" strategy
        This is a simplified implementation - would need more calculation for a real implementation
        """
        # Mock implementation - in a real system, you'd calculate this properly
        return {
            "yearlyData": [],
            "finalNetWorth": 1000000,
            "totalInterestPaid": 50000,
            "loanPayoffDetails": {},
            "investmentDetails": []
        }

    # backend/app/services/wealth_optimizer.py (continued)
    @staticmethod
    def _calculate_debt_avalanche_strategy(loans: List[Dict[str, Any]], monthly_budget: float) -> Dict[str, Any]:
        """
        Calculate results for "Debt Avalanche" strategy
        This strategy prioritizes paying off the highest interest loan first
        """
        # Mock implementation - in a real system, you'd calculate this properly
        return {
            "yearlyData": [],
            "finalNetWorth": 950000,
            "totalInterestPaid": 40000,
            "loanPayoffDetails": {},
            "investmentDetails": []
        }

    @staticmethod
    def _calculate_hybrid_strategy(loans: List[Dict[str, Any]], monthly_budget: float) -> Dict[str, Any]:
        """
        Calculate results for "Hybrid Approach" strategy
        This strategy pays off high interest loans while investing for low interest loans
        """
        # Mock implementation - in a real system, you'd calculate this properly
        return {
            "yearlyData": [],
            "finalNetWorth": 980000,
            "totalInterestPaid": 45000,
            "loanPayoffDetails": {},
            "investmentDetails": []
        }

    @staticmethod
    def _calculate_aggressive_paydown_strategy(loans: List[Dict[str, Any]], monthly_budget: float) -> Dict[str, Any]:
        """
        Calculate results for "5-Year Aggressive Paydown" strategy
        This strategy focuses on paying down all debt aggressively for 5 years
        """
        # Mock implementation - in a real system, you'd calculate this properly
        return {
            "yearlyData": [],
            "finalNetWorth": 920000,
            "totalInterestPaid": 35000,
            "loanPayoffDetails": {},
            "investmentDetails": []
        }