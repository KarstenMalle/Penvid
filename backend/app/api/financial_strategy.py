from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from ..utils.auth import verify_token
from ..utils.api_util import standardize_response  # Remove handle_exceptions
from ..calculations import convert_currency
from ..services.wealth_optimizer import WealthOptimizerService

router = APIRouter(prefix="/api", tags=["financial_strategy"])

@router.post("/user/{user_id}/financial-strategy")
async def get_financial_strategy(
        user_id: str,
        request: Dict[str, Any] = Body(...),  # Use Body for request data
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Compare financial strategies and provide recommendations
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        # Extract data from the request dictionary
        loans_data = request.get("loans", [])
        monthly_surplus = request.get("monthly_surplus", 0)
        annual_investment_return = request.get("annual_investment_return", 0.07)
        inflation_rate = request.get("inflation_rate", 0.025)
        risk_factor = request.get("risk_factor", 0.2)
        currency = request.get("currency", "USD")

        # Validate request data
        if not loans_data or len(loans_data) == 0:
            raise HTTPException(status_code=422, detail="No loans provided in request")

        if monthly_surplus <= 0:
            raise HTTPException(status_code=422, detail="Monthly surplus must be greater than 0")

        # Convert loans to dictionary format and convert currency to USD
        loans_dict = []
        for loan in loans_data:
            loans_dict.append({
                "id": loan.get("loan_id"),
                "name": loan.get("name", ""),
                "balance": convert_currency(loan.get("balance", 0), currency, "USD"),
                "interestRate": loan.get("interest_rate", 0),
                "termYears": loan.get("term_years", 0),
                "minimumPayment": convert_currency(loan.get("minimum_payment", 0), currency, "USD"),
                "loanType": loan.get("loan_type", "OTHER")
            })

        # Convert monthly surplus to USD
        monthly_surplus_usd = convert_currency(monthly_surplus, currency, "USD")

        # Calculate loan comparisons
        loan_comparisons = WealthOptimizerService.calculate_loan_comparisons(
            loans=loans_dict,
            monthly_surplus=monthly_surplus_usd,
            risk_factor=risk_factor
        )

        # Calculate strategy comparisons
        strategy_results = WealthOptimizerService.calculate_strategy_results(
            loans=loans_dict,
            monthly_budget=monthly_surplus_usd
        )

        # Combine results
        result = {
            "recommendation": strategy_results["recommendation"],
            "results": strategy_results["results"],
            "yearByYearData": strategy_results["yearByYearData"],
            "totalInterestPaid": strategy_results["totalInterestPaid"],
            "totalInvestmentValue": strategy_results["totalInvestmentValue"],
            "loanComparisons": loan_comparisons
        }

        return standardize_response(data=result)

    except HTTPException:
        # Re-raise HTTP exceptions to preserve status codes
        raise
    except Exception as e:
        return standardize_response(
            error=f"Error calculating financial strategy: {str(e)}"
        )