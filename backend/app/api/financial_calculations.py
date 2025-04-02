# backend/app/api/financial_calculations.py

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any, List
from ..models import (
    Loan,
    FinancialStrategyRequest,
    LoanComparison,
    StrategyRecommendation,
    YearlyData
)
from ..calculations import (
    calculate_financial_strategy_comparison,
    generate_amortization_schedule,
    calculate_investment_projection
)
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["financial_calculations"])

class LoanComparisonRequest(BaseModel):
    loan: Loan
    monthly_surplus: float
    annual_investment_return: float = 0.07
    inflation_rate: float = 0.025
    risk_factor: float = 0.2
    currency: str = "USD"

@router.post("/financial-calculations/loan-comparison")
@handle_exceptions
async def get_loan_comparison(request: LoanComparisonRequest):
    """
    Calculate comparison data for a single loan: paying it down vs investing
    """
    try:
        # Convert loan to dictionary for the calculation function
        loan_dict = {
            "loan_id": request.loan.loan_id,
            "name": request.loan.name,
            "balance": request.loan.balance,
            "interest_rate": request.loan.interest_rate,
            "term_years": request.loan.term_years,
            "minimum_payment": request.loan.minimum_payment
        }

        # Calculate baseline amortization (minimum payments only)
        baseline_amortization = generate_amortization_schedule(
            principal=request.loan.balance,
            annual_rate=request.loan.interest_rate / 100,  # Convert percentage to decimal
            monthly_payment=request.loan.minimum_payment
        )

        # Calculate accelerated amortization (with extra payments)
        accelerated_amortization = generate_amortization_schedule(
            principal=request.loan.balance,
            annual_rate=request.loan.interest_rate / 100,  # Convert percentage to decimal
            monthly_payment=request.loan.minimum_payment,
            extra_payment=request.monthly_surplus
        )

        # Calculate interest savings
        interest_savings = baseline_amortization['total_interest_paid'] - accelerated_amortization['total_interest_paid']

        # Calculate time savings
        months_saved = baseline_amortization['months_to_payoff'] - accelerated_amortization['months_to_payoff']

        # Calculate investment growth if that money was invested instead
        # (for the same time period as the accelerated payoff)
        short_term_investment = calculate_investment_projection(
            monthly_amount=request.monthly_surplus,
            annual_return=request.annual_investment_return,
            months=accelerated_amortization['months_to_payoff'],
            inflation_rate=request.inflation_rate,
            risk_factor=request.risk_factor
        )

        # Calculate full-term investment growth (investing for the entire baseline loan term)
        long_term_investment = calculate_investment_projection(
            monthly_amount=request.monthly_surplus,
            annual_return=request.annual_investment_return,
            months=baseline_amortization['months_to_payoff'],
            inflation_rate=request.inflation_rate,
            risk_factor=request.risk_factor
        )

        # Calculate investment value after paying off loan aggressively, then investing
        # First, calculate how many months left in the original term
        remaining_months = baseline_amortization['months_to_payoff'] - accelerated_amortization['months_to_payoff']

        # Then calculate growth for investing the full payment + surplus for the remaining time
        total_monthly_amount = request.loan.minimum_payment + request.monthly_surplus
        after_payoff_investment = calculate_investment_projection(
            monthly_amount=total_monthly_amount,
            annual_return=request.annual_investment_return,
            months=remaining_months,
            inflation_rate=request.inflation_rate,
            risk_factor=request.risk_factor
        )

        # Compare strategies - is paying down better than investing over the short term?
        paying_down_better = interest_savings > short_term_investment['risk_adjusted_balance']

        # Compare over the full term
        full_term_paying_down_better = after_payoff_investment['risk_adjusted_balance'] > long_term_investment['risk_adjusted_balance']

        # Determine recommendation based on interest rate vs market return
        market_return = request.annual_investment_return
        risk_adjusted_return = market_return * (1 - request.risk_factor)
        interest_rate = request.loan.interest_rate / 100

        recommendation = ""
        if interest_rate > market_return + 0.01:  # 1% higher than market
            recommendation = "definitely-pay"
        elif interest_rate > risk_adjusted_return:  # Higher than risk-adjusted market return
            recommendation = "probably-pay"
        else:
            recommendation = "invest-instead"

        # Create response
        comparison_result = {
            "loanId": request.loan.loan_id,
            "loanName": request.loan.name,
            "interestRate": request.loan.interest_rate,
            "originalBalance": request.loan.balance,
            "minimumPayment": request.loan.minimum_payment,
            "baselinePayoff": {
                "payoffTimeMonths": baseline_amortization['months_to_payoff'],
                "payoffTimeYears": baseline_amortization['months_to_payoff'] / 12,
                "totalInterestPaid": baseline_amortization['total_interest_paid'],
                "totalPaid": request.loan.balance + baseline_amortization['total_interest_paid']
            },
            "acceleratedPayoff": {
                "payoffTimeMonths": accelerated_amortization['months_to_payoff'],
                "payoffTimeYears": accelerated_amortization['months_to_payoff'] / 12,
                "totalInterestPaid": accelerated_amortization['total_interest_paid'],
                "totalPaid": request.loan.balance + accelerated_amortization['total_interest_paid']
            },
            "extraMonthlyPayment": request.monthly_surplus,
            "interestSaved": interest_savings,
            "potentialInvestmentGrowth": short_term_investment['risk_adjusted_balance'],
            "longTermInvestmentGrowth": long_term_investment['risk_adjusted_balance'],
            "acceleratedStrategyTotalValue": after_payoff_investment['risk_adjusted_balance'],
            "payingDownIsBetter": paying_down_better,
            "netAdvantage": abs(interest_savings - short_term_investment['risk_adjusted_balance']),
            "betterStrategy": "pay-down" if paying_down_better else "invest",
            "recommendation": recommendation,
            "fullTermComparison": {
                "investingOnlyNetWorth": long_term_investment['risk_adjusted_balance'] - baseline_amortization['total_interest_paid'],
                "acceleratedStrategyNetWorth": after_payoff_investment['risk_adjusted_balance'] - accelerated_amortization['total_interest_paid'],
                "isBetter": full_term_paying_down_better
            }
        }

        return standardize_response(data=comparison_result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating loan comparison: {str(e)}")


@router.post("/financial-calculations/debt-payoff-strategies")
@handle_exceptions
async def get_debt_payoff_strategies(
        request: Dict[str, Any],
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate different debt payoff strategies (snowball, avalanche, etc.)
    """
    try:
        # Extract parameters
        loans = request.get("loans", [])
        monthly_budget = request.get("monthly_budget", 0)

        if not