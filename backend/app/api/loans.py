# backend/app/api/loans.py
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ..models import Loan, FinancialOverview, AmortizationRequest, AmortizationResponse
from ..database import get_supabase_client
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, check_supabase_error, standardize_response
from ..calculations import generate_amortization_schedule

router = APIRouter(prefix="/api", tags=["loans"])

@router.get("/user/{user_id}/loans")
@handle_exceptions
async def get_user_loans(
        user_id: str,
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Get all loans for a user with proper currency conversion
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Query loans from database
        loans_response = supabase.table("loans").select("*").eq("user_id", user_id).order("name").execute()

        if loans_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loans_response.error.message}")

        # Format the loans for the response
        formatted_loans = [
            {
                "id": loan["loan_id"],
                "name": loan["name"],
                "balance": loan["balance"],
                "interestRate": loan["interest_rate"],
                "termYears": loan["term_years"],
                "minimumPayment": loan["minimum_payment"],
                "loanType": loan.get("loan_type", "OTHER")
            }
            for loan in loans_response.data
        ]

        # Return the loans - middleware will handle currency conversion
        return standardize_response(data=formatted_loans, request=request)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving loans: {str(e)}")

@router.get("/user/{user_id}/loan/{loan_id}")
@handle_exceptions
async def get_loan(
        user_id: str,
        loan_id: int,
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Get details for a specific loan
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Query the specific loan
        loan_response = supabase.table("loans").select("*").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if loan_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loan_response.error.message}")

        if not loan_response.data:
            raise HTTPException(status_code=404, detail="Loan not found")

        # Format the loan for the response
        loan = loan_response.data[0]
        formatted_loan = {
            "id": loan["loan_id"],
            "name": loan["name"],
            "balance": loan["balance"],
            "interestRate": loan["interest_rate"],
            "termYears": loan["term_years"],
            "minimumPayment": loan["minimum_payment"],
            "loanType": loan.get("loan_type", "OTHER")
        }

        # Return the loan - middleware will handle currency conversion
        return standardize_response(data=formatted_loan, request=request)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving loan: {str(e)}")

@router.post("/user/{user_id}/loans")
@handle_exceptions
async def save_user_loans(
        user_id: str,
        loans: List[Dict[str, Any]] = Body(...),
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Save multiple loans for a user
    API handles currency conversion - loan values should be in the user's preferred currency
    """
    # Ensure user is updating their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Get user's currency preference from request header
        currency_preference = request.headers.get("X-Currency-Preference", "USD")

        # Format loans for database, converting to USD if needed
        formatted_loans = []
        for loan in loans:
            # Convert values from user's currency to USD for storage
            loan_data = {
                "user_id": user_id,
                "loan_id": loan.get("id"),
                "name": loan.get("name"),
                "balance": loan.get("balance"),
                "interest_rate": loan.get("interestRate"),
                "term_years": loan.get("termYears"),
                "minimum_payment": loan.get("minimumPayment"),
                "loan_type": loan.get("loanType", "OTHER"),
                "updated_at": "now()"
            }
            formatted_loans.append(loan_data)

        # Get existing loan IDs
        existing_loans_response = supabase.table("loans").select("loan_id").eq("user_id", user_id).execute()

        if existing_loans_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {existing_loans_response.error.message}")

        existing_loan_ids = [loan["loan_id"] for loan in existing_loans_response.data]

        # Determine which loans to insert/update/delete
        current_loan_ids = [loan["loan_id"] for loan in formatted_loans]
        loan_ids_to_delete = [id for id in existing_loan_ids if id not in current_loan_ids]

        # Upsert all loans
        if formatted_loans:
            upsert_response = supabase.table("loans").upsert(formatted_loans).execute()
            if upsert_response.error:
                raise HTTPException(status_code=500, detail=f"Database error: {upsert_response.error.message}")

        # Delete loans that were removed
        if loan_ids_to_delete:
            delete_response = supabase.table("loans").delete().eq("user_id", user_id).in_("loan_id", loan_ids_to_delete).execute()
            if delete_response.error:
                raise HTTPException(status_code=500, detail=f"Database error: {delete_response.error.message}")

        return standardize_response(
            data={"saved": len(formatted_loans), "deleted": len(loan_ids_to_delete)},
            message="Loans saved successfully",
            request=request
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving loans: {str(e)}")

@router.post("/user/{user_id}/loan")
@handle_exceptions
async def create_loan(
        user_id: str,
        loan: Dict[str, Any] = Body(...),
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Create a new loan for a user
    API handles currency conversion - loan values should be in the user's preferred currency
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Find the next available loan ID
        max_id_response = supabase.table("loans").select("loan_id").eq("user_id", user_id).execute()

        if max_id_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {max_id_response.error.message}")

        # Calculate next ID (max + 1, or 1 if no loans exist)
        next_id = 1
        if max_id_response.data:
            existing_ids = [l["loan_id"] for l in max_id_response.data if l["loan_id"] is not None]
            if existing_ids:
                next_id = max(existing_ids) + 1

        # Format the loan for database
        formatted_loan = {
            "user_id": user_id,
            "loan_id": next_id,
            "name": loan.get("name", f"Loan {next_id}"),
            "balance": loan.get("balance", 0),
            "interest_rate": loan.get("interestRate", 0),
            "term_years": loan.get("termYears", 0),
            "minimum_payment": loan.get("minimumPayment", 0),
            "loan_type": loan.get("loanType", "OTHER"),
            "created_at": "now()",
            "updated_at": "now()"
        }

        # Insert the loan
        insert_response = supabase.table("loans").insert(formatted_loan).execute()

        if insert_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {insert_response.error.message}")

        # Format the result
        result = {
            "id": next_id,
            "name": formatted_loan["name"],
            "balance": formatted_loan["balance"],
            "interestRate": formatted_loan["interest_rate"],
            "termYears": formatted_loan["term_years"],
            "minimumPayment": formatted_loan["minimum_payment"],
            "loanType": formatted_loan["loan_type"]
        }

        return standardize_response(data=result, message="Loan created successfully", request=request)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating loan: {str(e)}")

@router.put("/user/{user_id}/loan/{loan_id}")
@handle_exceptions
async def update_loan(
        user_id: str,
        loan_id: int,
        loan: Dict[str, Any] = Body(...),
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Update a specific loan
    API handles currency conversion - loan values should be in the user's preferred currency
    """
    # Ensure user is updating their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Verify the loan exists
        check_response = supabase.table("loans").select("loan_id").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if check_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {check_response.error.message}")

        if not check_response.data:
            raise HTTPException(status_code=404, detail="Loan not found")

        # Format the loan for database
        formatted_loan = {
            "user_id": user_id,
            "loan_id": loan_id,
            "name": loan.get("name"),
            "balance": loan.get("balance"),
            "interest_rate": loan.get("interestRate"),
            "term_years": loan.get("termYears"),
            "minimum_payment": loan.get("minimumPayment"),
            "loan_type": loan.get("loanType"),
            "updated_at": "now()"
        }

        # Remove None values
        formatted_loan = {k: v for k, v in formatted_loan.items() if v is not None}

        # Update the loan
        update_response = supabase.table("loans").update(formatted_loan).eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if update_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {update_response.error.message}")

        # Get the updated loan
        get_response = supabase.table("loans").select("*").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if get_response.error or not get_response.data:
            return standardize_response(
                message="Loan updated successfully",
                request=request
            )

        # Format the result
        updated_loan = get_response.data[0]
        result = {
            "id": updated_loan["loan_id"],
            "name": updated_loan["name"],
            "balance": updated_loan["balance"],
            "interestRate": updated_loan["interest_rate"],
            "termYears": updated_loan["term_years"],
            "minimumPayment": updated_loan["minimum_payment"],
            "loanType": updated_loan.get("loan_type", "OTHER")
        }

        return standardize_response(data=result, message="Loan updated successfully", request=request)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating loan: {str(e)}")

@router.delete("/user/{user_id}/loan/{loan_id}")
@handle_exceptions
async def delete_loan(
        user_id: str,
        loan_id: int,
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Delete a specific loan
    """
    # Ensure user is deleting their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Check if the loan exists
        check_response = supabase.table("loans").select("loan_id").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if check_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {check_response.error.message}")

        if not check_response.data:
            raise HTTPException(status_code=404, detail="Loan not found")

        # Delete the loan
        delete_response = supabase.table("loans").delete().eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if delete_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {delete_response.error.message}")

        return standardize_response(message="Loan deleted successfully", request=request)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting loan: {str(e)}")

@router.post("/loans/{loan_id}/tax-savings")
@handle_exceptions
async def get_loan_tax_savings(
        loan_id: int,
        user_id: str = Body(..., embed=True),
        country_code: str = Body("US", embed=True),
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate tax savings for a loan based on country-specific rules
    Takes loan_id instead of full loan object
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Get the loan from database
        loan_response = supabase.table("loans").select("*").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if loan_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loan_response.error.message}")

        if not loan_response.data:
            raise HTTPException(status_code=404, detail="Loan not found")

        loan_data = loan_response.data[0]

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
        loan_type = loan_data.get("loan_type", "OTHER").upper()

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

        # Calculate annual interest
        balance = loan_data.get("balance", 0)
        interest_rate = loan_data.get("interest_rate", 0) / 100  # Convert from percentage
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
            "loan_id": loan_id,
            "loan_type": loan_type
        }

        return standardize_response(data=result, request=request)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating tax savings: {str(e)}")

@router.get("/user/{user_id}/financial-overview")
@handle_exceptions
async def get_financial_overview(
        user_id: str,
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Get a user's financial overview including loans and surplus balance
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Query loans
        loans_response = supabase.table("loans").select("*").eq("user_id", user_id).execute()

        if loans_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loans_response.error.message}")

        # Format loans
        loans = [
            {
                "loan_id": loan['loan_id'],
                "name": loan['name'],
                "balance": loan['balance'],
                "interest_rate": loan['interest_rate'],
                "term_years": loan['term_years'],
                "minimum_payment": loan['minimum_payment'],
                "loan_type": loan.get('loan_type', "OTHER")
            }
            for loan in loans_response.data
        ]

        # Query accounts to calculate surplus
        accounts_response = supabase.table("accounts").select("balance").eq("user_id", user_id).execute()

        if accounts_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {accounts_response.error.message}")

        # Calculate surplus as total account balances (simplified)
        surplus = sum(account['balance'] for account in accounts_response.data) if accounts_response.data else 0

        # Return financial overview
        overview = {
            "loans": loans,
            "surplus_balance": surplus
        }

        return standardize_response(data=overview, request=request)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving financial overview: {str(e)}")

@router.post("/user/{user_id}/loan/{loan_id}/amortization")
@handle_exceptions
async def get_loan_amortization(
        user_id: str,
        loan_id: int,
        extra_payment: float = Body(0, embed=True),
        max_years: int = Body(30, embed=True),
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate an amortization schedule for a loan using loan_id
    All loan data is fetched from the database
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Get the loan from database
        loan_response = supabase.table("loans").select("*").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if loan_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loan_response.error.message}")

        if not loan_response.data:
            raise HTTPException(status_code=404, detail="Loan not found")

        # Extract loan details
        loan = loan_response.data[0]
        principal = loan["balance"]
        annual_rate = loan["interest_rate"]
        monthly_payment = loan["minimum_payment"]

        # Log inputs for debugging
        logger.info(f"Generating amortization schedule: principal={principal}, rate={annual_rate}%, payment={monthly_payment}")

        # Generate amortization schedule
        amortization_data = generate_amortization_schedule(
            principal=principal,
            annual_rate=annual_rate,
            monthly_payment=monthly_payment,
            extra_payment=extra_payment,
            max_years=max_years
        )

        # Log results for debugging
        logger.info(f"Amortization result: months={amortization_data['months_to_payoff']}, interest={amortization_data['total_interest_paid']}")

        # Format response with payment analysis
        response_data = {
            "schedule": amortization_data["schedule"],
            "total_interest_paid": amortization_data["total_interest_paid"],
            "months_to_payoff": amortization_data["months_to_payoff"],
            "payment_analysis": {
                "loanId": loan_id,
                "loanName": loan["name"],
                "loanType": loan.get("loan_type", "OTHER"),
                "initialBalance": principal,
                "interestRate": annual_rate,
                "monthlyPayment": monthly_payment,
                "extraPayment": extra_payment,
                "totalPaid": principal + amortization_data["total_interest_paid"],
                "totalInterest": amortization_data["total_interest_paid"],
                "totalPrincipal": principal,
                "payoffTimeMonths": amortization_data["months_to_payoff"],
                "payoffTimeYears": amortization_data["months_to_payoff"] / 12,
                "interestToBalanceRatio": amortization_data["total_interest_paid"] / principal,
                "principalToBalanceRatio": 1.0,
                "averageMonthlyInterest": amortization_data["total_interest_paid"] / amortization_data["months_to_payoff"] if amortization_data["months_to_payoff"] > 0 else 0
            }
        }

        return standardize_response(data=response_data, request=request)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating amortization schedule: {str(e)}")

@router.post("/user/{user_id}/loans/default")
@handle_exceptions
async def create_default_loan(
        user_id: str,
        request: Request,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Create a default loan for a user if they have none
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Check if user already has loans
        existing_loans_response = supabase.table("loans").select("loan_id").eq("user_id", user_id).limit(1).execute()

        if existing_loans_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {existing_loans_response.error.message}")

        if existing_loans_response.data and len(existing_loans_response.data) > 0:
            return standardize_response(
                message="User already has loans",
                data={"loan_exists": True},
                request=request
            )

        # Create default loan
        default_loan = {
            "user_id": user_id,
            "loan_id": 1,
            "name": "Student Loan",
            "balance": 25000,
            "interest_rate": 5.8,
            "term_years": 10,
            "minimum_payment": 275,
            "loan_type": "STUDENT",
            "created_at": "now()",
            "updated_at": "now()"
        }

        insert_response = supabase.table("loans").insert(default_loan).execute()

        if insert_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {insert_response.error.message}")

        # Format response
        created_loan = {
            "id": default_loan["loan_id"],
            "name": default_loan["name"],
            "balance": default_loan["balance"],
            "interestRate": default_loan["interest_rate"],
            "termYears": default_loan["term_years"],
            "minimumPayment": default_loan["minimum_payment"],
            "loanType": default_loan["loan_type"]
        }

        return standardize_response(
            data=created_loan,
            message="Default loan created successfully",
            request=request
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating default loan: {str(e)}")