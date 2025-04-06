# backend/app/api/tax_savings.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response
from ..database import get_supabase_client

router = APIRouter(prefix="/api", tags=["tax_savings"])

class LoanInfoRequest(BaseModel):
    user_id: str
    loan: Dict[str, Any]
    country_code: str = "US"

@router.post("/loans/tax-savings")
@handle_exceptions
async def calculate_tax_savings(
        request: LoanInfoRequest = Body(...),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate tax savings for a loan based on country-specific rules
    """
    # Ensure user is accessing their own data
    if request.user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Get loan details
        loan = request.loan
        country_code = request.country_code

        # Get country-specific financial rules
        country_rules_response = supabase.table("country_financial_rules").select("*").eq("country_code", country_code).execute()

        if country_rules_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {country_rules_response.error.message}")

        if not country_rules_response.data:
            # Use US as fallback if country not found
            country_rules_response = supabase.table("country_financial_rules").select("*").eq("country_code", "US").execute()

            if country_rules_response.error or not country_rules_response.data:
                raise HTTPException(status_code=404, detail="Tax rules not found")

        country_rules = country_rules_response.data[0]

        # Check loan type for deductibility
        loan_type = loan.get("loan_type", "OTHER").upper()

        # Determine if loan interest is tax deductible
        is_deductible = False
        deduction_rate = 0
        deduction_cap = None

        if loan_type in ["MORTGAGE", "MORTGAGE_BOND", "HOME_LOAN"]:
            is_deductible = country_rules.get("mortgage_interest_deductible", False)
            deduction_rate = country_rules.get("mortgage_interest_deduction_rate")
            deduction_cap = country_rules.get("mortgage_interest_deduction_cap")
        elif loan_type == "STUDENT":
            is_deductible = country_rules.get("student_loan_interest_deductible", False)
            deduction_rate = country_rules.get("student_loan_interest_deduction_rate")
            deduction_cap = country_rules.get("student_loan_interest_deduction_cap")
        elif loan_type == "PERSONAL":
            is_deductible = country_rules.get("personal_loan_interest_deductible", False)
        elif loan_type == "AUTO":
            is_deductible = country_rules.get("auto_loan_interest_deductible", False)

        # If deduction rate is not set but is deductible, use a default
        if is_deductible and not deduction_rate:
            deduction_rate = 0.25  # Default to 25% in US
            if country_code == "DK":
                deduction_rate = 0.33  # Default to 33% in Denmark

        # Calculate annual interest (simplified - in reality would be more complex)
        balance = loan.get("balance", 0)
        interest_rate = loan.get("interest_rate", 0) / 100  # Convert from percentage
        annual_interest = balance * interest_rate

        # Apply cap if exists
        if deduction_cap and balance > deduction_cap:
            capped_balance = deduction_cap
            annual_interest = capped_balance * interest_rate

        # Calculate estimated tax savings
        estimated_savings = 0
        if is_deductible:
            estimated_savings = annual_interest * deduction_rate

        # Generate recommendations based on tax status
        recommendations = []
        if is_deductible:
            recommendations = [
                "Remember to include loan interest in your tax return",
                "Keep detailed records of all interest payments",
                "Consider consulting a tax professional for optimal tax strategies"
            ]

            if loan_type in ["MORTGAGE", "MORTGAGE_BOND", "HOME_LOAN"] and country_code == "US":
                recommendations.append("For US mortgage interest, itemized deductions must exceed standard deduction to benefit")

            if deduction_cap and balance > deduction_cap:
                recommendations.append(f"Your loan exceeds the deduction cap of {deduction_cap}. Only interest on the first {deduction_cap} is deductible.")

        # Return tax savings information
        result = {
            "tax_deductible": is_deductible,
            "deduction_rate": deduction_rate if deduction_rate else None,
            "deduction_cap": deduction_cap,
            "annual_interest": annual_interest,
            "estimated_tax_savings": estimated_savings,
            "recommendations": recommendations if is_deductible else None,
            "country_code": country_code,
            "country_name": country_rules.get("country_name"),
        }

        return standardize_response(data=result)

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating tax savings: {str(e)}")