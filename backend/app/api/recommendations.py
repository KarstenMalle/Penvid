from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from enum import Enum
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response

router = APIRouter(prefix="/api", tags=["recommendations"])

# Define priorities
class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# Define recommendation model
class Recommendation(BaseModel):
    title: str
    description: str
    priority: Priority

# Strategy explanations for consistent messaging
STRATEGY_EXPLANATIONS = {
    "Minimum Payments + Invest":
        "Pay only the minimum required payments on all loans and invest the rest in the S&P 500.",
    "Debt Avalanche":
        "Pay minimum on all loans, but put any extra money toward the highest interest loan first. "
        "Once paid off, move to the next highest interest loan. Invest only after all loans are paid off.",
    "Hybrid Approach":
        "Pay off only loans with interest rates higher than the S&P 500's inflation-adjusted return, and invest the rest.",
    "5-Year Aggressive Paydown":
        "Aggressively pay down all loans for the first 5 years (focusing on high-interest loans first), "
        "then switch to investing all extra money after that.",
    "Risk-Balanced Approach":
        "Balance guaranteed returns from debt reduction with potential growth from investments, "
        "optimizing for your specific risk tolerance level."
}

@router.post("/recommendations", response_model=Dict[str, Any])
@handle_exceptions
async def generate_recommendations(
        request: Dict[str, Any],
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate personalized financial recommendations based on user's situation
    """
    try:
        loans = request.get("loans", [])
        monthly_available = request.get("monthly_available", 0)
        results = request.get("results", {})
        optimal_strategy = request.get("optimal_strategy", {})
        loan_comparisons = request.get("loan_comparisons", [])

        if not loans or monthly_available <= 0:
            return standardize_response(
                error="Insufficient data for generating recommendations"
            )

        recommendations = []

        # 1. General strategy recommendation
        if optimal_strategy and "name" in optimal_strategy:
            strategy_name = optimal_strategy["name"]
            recommendations.append({
                "title": f'Follow the "{strategy_name}" strategy',
                "description": STRATEGY_EXPLANATIONS.get(
                    strategy_name,
                    "This strategy provides the best long-term financial outcome based on your specific situation."
                ),
                "priority": Priority.HIGH
            })

        # 2. Add loan-specific recommendations
        if loan_comparisons:
            best_loan_to_pay_down = None
            best_pay_advantage = 0

            best_loan_to_invest = None
            best_invest_advantage = 0

            for loan in loan_comparisons:
                if loan.get("payingDownIsBetter", False) and loan.get("netAdvantage", 0) > best_pay_advantage:
                    best_loan_to_pay_down = loan
                    best_pay_advantage = loan.get("netAdvantage", 0)

                elif not loan.get("payingDownIsBetter", True) and loan.get("netAdvantage", 0) > best_invest_advantage:
                    best_loan_to_invest = loan
                    best_invest_advantage = loan.get("netAdvantage", 0)

            # Add recommendation for best loan to pay down
            if best_loan_to_pay_down:
                recommendations.append({
                    "title": f"Prioritize paying down your {best_loan_to_pay_down['loanName']}",
                    "description": f"Based on your {best_loan_to_pay_down['loanName']}'s {best_loan_to_pay_down['interestRate']:.2f}% interest rate, paying it down early saves you more than investing would earn over the same time period. You'll be ${best_loan_to_pay_down['netAdvantage']:,.0f} better off.",
                    "priority": Priority.HIGH
                })

            # Add recommendation for best loan to invest instead
            if best_loan_to_invest:
                recommendations.append({
                    "title": f"Pay only minimum on your {best_loan_to_invest['loanName']}",
                    "description": f"With its low {best_loan_to_invest['interestRate']:.2f}% interest rate, you're better off making minimum payments on your {best_loan_to_invest['loanName']} and investing the difference. You could be ${best_loan_to_invest['netAdvantage']:,.0f} ahead by investing.",
                    "priority": Priority.MEDIUM
                })

        # 3. Check for high-interest loans
        high_interest_loans = [loan for loan in loans
                               if loan.get("interestRate", 0) > 7.0]

        if high_interest_loans:
            loan_names = ", ".join([loan.get("name", f"Loan {loan.get('id', '')}")
                                    for loan in high_interest_loans])
            recommendations.append({
                "title": "Prioritize high-interest debt",
                "description": f"You have high-interest loans ({loan_names}) with rates above 7%. These should be prioritized for payoff as the guaranteed return from eliminating this interest exceeds typical investment returns.",
                "priority": Priority.HIGH
            })

        # 4. Emergency fund recommendation (always include this)
        recommendations.append({
            "title": "Build an emergency fund first",
            "description": "Before implementing this strategy, ensure you have 3-6 months of expenses saved in an emergency fund. This provides stability and prevents new debt if unexpected expenses arise.",
            "priority": Priority.HIGH
        })

        # 5. Cash flow recommendation if applicable
        total_minimum_payment = sum(loan.get("minimumPayment", 0) for loan in loans)
        if monthly_available < total_minimum_payment * 1.5:
            recommendations.append({
                "title": "Increase your available cash flow",
                "description": "You have limited funds available after minimum payments. Consider ways to increase your income or reduce expenses to speed up your wealth-building journey.",
                "priority": Priority.MEDIUM
            })

        # 6. Risk tolerance recommendation
        recommendations.append({
            "title": "Consider your personal risk tolerance",
            "description": "While our analysis uses risk-adjusted returns to account for market volatility, your personal risk tolerance should influence your decision. If market fluctuations would cause you significant stress, prioritizing guaranteed debt reduction might be better for your peace of mind.",
            "priority": Priority.MEDIUM
        })

        # 7. Tax advantages recommendation
        recommendations.append({
            "title": "Don't forget tax advantages",
            "description": "When deciding between investing and debt payoff, consider tax implications. Mortgage interest may be tax-deductible, and retirement accounts offer tax advantages that could tilt the balance toward investing.",
            "priority": Priority.MEDIUM
        })

        # Return the recommendations
        return standardize_response(data=recommendations)

    except Exception as e:
        return standardize_response(
            error=f"Error generating recommendations: {str(e)}"
        )