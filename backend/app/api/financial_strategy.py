# backend/app/api/financial_strategy.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from ..models import FinancialStrategyRequest, FinancialStrategyResponse, Loan
from ..utils.api_util import handle_exceptions, standardize_response
from ..utils.auth import verify_token
from ..calculations import convert_currency
from ..services.wealth_optimizer import WealthOptimizerService

router = APIRouter(prefix="/api", tags=["financial_strategy"])

@router.post("/user/{user_id}/financial-strategy", response_model=FinancialStrategyResponse)
@handle_exceptions
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
        # Validate request data
        if not request.loans or len(request.loans) == 0:
            raise HTTPException(status_code=422, detail="No loans provided in request")

        if request.monthly_surplus <= 0:
            raise HTTPException(status_code=422, detail="Monthly surplus must be greater than 0")

        # Convert loans to dictionary format and convert currency to USD
        loans_dict = []
        for loan in request.loans:
            loans_dict.append({
                "id": loan.loan_id,
                "name": loan.name,
                "balance": convert_currency(loan.balance, request.currency, "USD"),
                "interestRate": loan.interest_rate,
                "termYears": loan.term_years,
                "minimumPayment": convert_currency(loan.minimum_payment, request.currency, "USD"),
                "loanType": loan.loan_type
            })

        # Convert monthly surplus to USD
        monthly_surplus_usd = convert_currency(request.monthly_surplus, request.currency, "USD")

        # Calculate loan comparisons
        loan_comparisons = WealthOptimizerService.calculate_loan_comparisons(
            loans=loans_dict,
            monthly_surplus=monthly_surplus_usd,
            risk_factor=request.risk_factor
        )

        # Calculate strategy comparisons
        strategy_results = WealthOptimizerService.calculate_strategy_results(
            loans=loans_dict,
            monthly_budget=monthly_surplus_usd
        )

        # Convert monetary values back to user's currency
        # (This would require detailed implementation)

        # Combine results
        result = {
            "recommendation": strategy_results["recommendation"],
            "results": strategy_results["results"],
            "yearByYearData": strategy_results["yearByYearData"],
            "totalInterestPaid": strategy_results["totalInterestPaid"],
            "totalInvestmentValue": strategy_results["totalInvestmentValue"],
            "loanComparisons": loan_comparisons
        }

        return result

    except HTTPException:
        # Re-raise HTTP exceptions to preserve status codes
        raise
    except Exception as e:
        print(f"Error calculating financial strategy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating financial strategy: {str(e)}")