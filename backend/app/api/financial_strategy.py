from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from ..models import FinancialStrategyRequest, FinancialStrategyResponse, Loan
from ..utils.api_util import handle_exceptions
from ..utils.auth import verify_token
from ..calculations import calculate_financial_strategy_comparison, convert_currency

router = APIRouter(prefix="/api", tags=["financial_strategy"])

@router.post("/user/{user_id}/financial-strategy", response_model=FinancialStrategyResponse)
async def get_financial_strategy(
        user_id: str,
        request: FinancialStrategyRequest,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Compare financial strategies and provide recommendations
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        # Debug logging
        print(f"Received request for financial strategy: {request}")

        # Validate request data
        if not request.loans or len(request.loans) == 0:
            raise HTTPException(status_code=422, detail="No loans provided in request")

        if request.monthly_surplus <= 0:
            raise HTTPException(status_code=422, detail="Monthly surplus must be greater than 0")

        # Convert loans to dictionary format and convert currency to USD
        loans_dict = []
        for loan in request.loans:
            # Debug each loan
            print(f"Processing loan: {loan}")

            loans_dict.append({
                "name": loan.name,
                "balance": convert_currency(loan.balance, request.currency, "USD"),
                "interest_rate": loan.interest_rate,  # Make sure this is already in decimal form
                "term_years": loan.term_years,
                "minimum_payment": convert_currency(loan.minimum_payment, request.currency, "USD"),
                "loan_type": loan.loan_type
            })

        # Convert monthly surplus to USD
        monthly_surplus_usd = convert_currency(request.monthly_surplus, request.currency, "USD")

        # More debugging
        print(f"Converted loans: {loans_dict}")
        print(f"Converted monthly surplus: {monthly_surplus_usd}")

        # Calculate strategy comparison
        strategy_comparison = calculate_financial_strategy_comparison(
            loans=loans_dict,
            monthly_surplus=monthly_surplus_usd,
            annual_investment_return=request.annual_investment_return,
            inflation_rate=request.inflation_rate,
            risk_factor=request.risk_factor
        )

        # Convert monetary values back to user's currency
        recommendation = strategy_comparison["recommendation"]
        recommendation["interest_savings"] = convert_currency(recommendation["interest_savings"], "USD", request.currency)
        recommendation["investment_value_after_loan_payoff"] = convert_currency(recommendation["investment_value_after_loan_payoff"], "USD", request.currency)
        recommendation["investment_value_immediate_invest"] = convert_currency(recommendation["investment_value_immediate_invest"], "USD", request.currency)
        recommendation["total_savings_advantage"] = convert_currency(recommendation["total_savings_advantage"], "USD", request.currency)

        # Convert amortization comparison values
        if "amortization_comparison" in strategy_comparison:
            amort_comp = strategy_comparison["amortization_comparison"]
            amort_comp["baseline"]["total_interest"] = convert_currency(amort_comp["baseline"]["total_interest"], "USD", request.currency)
            amort_comp["with_extra_payments"]["total_interest"] = convert_currency(amort_comp["with_extra_payments"]["total_interest"], "USD", request.currency)

        # Convert investment comparison values
        if "investment_comparison" in strategy_comparison:
            inv_comp = strategy_comparison["investment_comparison"]
            inv_comp["immediate_investment"]["final_balance"] = convert_currency(inv_comp["immediate_investment"]["final_balance"], "USD", request.currency)
            inv_comp["immediate_investment"]["risk_adjusted_balance"] = convert_currency(inv_comp["immediate_investment"]["risk_adjusted_balance"], "USD", request.currency)
            inv_comp["investment_after_payoff"]["final_balance"] = convert_currency(inv_comp["investment_after_payoff"]["final_balance"], "USD", request.currency)
            inv_comp["investment_after_payoff"]["risk_adjusted_balance"] = convert_currency(inv_comp["investment_after_payoff"]["risk_adjusted_balance"], "USD", request.currency)

        return strategy_comparison

    except HTTPException:
        # Re-raise HTTP exceptions to preserve status codes
        raise
    except Exception as e:
        print(f"Error calculating financial strategy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating financial strategy: {str(e)}")

@router.post("/recommendations")
@handle_exceptions
async def generate_recommendations(
        request: dict,
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

        # Define recommendation priorities
        HIGH = "high"
        MEDIUM = "medium"
        LOW = "low"

        recommendations = []

        # Implementation of the recommendation logic
        # --------------------------------------------

        # 1. General strategy recommendation
        if optimal_strategy and "name" in optimal_strategy:
            recommendations.append({
                "title": f"Follow the \"{optimal_strategy['name']}\" strategy",
                "description": STRATEGY_EXPLANATIONS.get(
                    optimal_strategy['name'],
                    "This strategy provides the best long-term financial outcome based on your specific situation."
                ),
                "priority": HIGH
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
                    "priority": HIGH
                })

            # Add recommendation for best loan to invest instead
            if best_loan_to_invest:
                recommendations.append({
                    "title": f"Pay only minimum on your {best_loan_to_invest['loanName']}",
                    "description": f"With its low {best_loan_to_invest['interestRate']:.2f}% interest rate, you're better off making minimum payments on your {best_loan_to_invest['loanName']} and investing the difference. You could be ${best_loan_to_invest['netAdvantage']:,.0f} ahead by investing.",
                    "priority": MEDIUM
                })

        # 3. More domain-specific recommendations...
        # (Emergency fund, high-interest debt, risk tolerance, etc.)

        # Return the recommendations
        return standardize_response(data=recommendations)

    except Exception as e:
        return standardize_response(
            error=f"Error generating recommendations: {str(e)}"
        )