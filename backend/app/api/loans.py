# backend/app/api/loans.py - Updated with better error handling and fixed endpoint conflict

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
from ..models import Loan, FinancialOverview, AmortizationRequest, AmortizationResponse
from ..database import get_supabase_client
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, check_supabase_error, standardize_response
from ..calculations import generate_amortization_schedule, convert_currency

router = APIRouter(prefix="/api", tags=["loans"])

@router.get("/user/{user_id}/financial-overview", response_model=FinancialOverview)
@handle_exceptions
async def get_financial_overview(user_id: str, authenticated_user_id: str = Depends(verify_token)):
    """
    Get a user's financial overview including loans and surplus balance
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Query loans
    loans_response = supabase.table("loans").select("*").eq("user_id", user_id).execute()
    check_supabase_error(loans_response, "Failed to retrieve loans")

    loans = []
    for loan in loans_response.data:
        loans.append(Loan(
            loan_id=loan['loan_id'],
            name=loan['name'],
            balance=loan['balance'],
            interest_rate=loan['interest_rate'],
            term_years=loan['term_years'],
            minimum_payment=loan['minimum_payment'],
            loan_type=loan.get('loan_type', "OTHER")
        ))

    # Query accounts to calculate surplus
    accounts_response = supabase.table("accounts").select("balance").eq("user_id", user_id).execute()
    check_supabase_error(accounts_response, "Failed to retrieve accounts")

    # Calculate surplus as total account balances (simplified)
    surplus = sum(account['balance'] for account in accounts_response.data) if accounts_response.data else 0

    # Return financial overview
    return FinancialOverview(loans=loans, surplus_balance=surplus)


@router.post("/user/{user_id}/loan/{loan_id}/amortization", response_model=AmortizationResponse)
@handle_exceptions
async def get_loan_amortization(
        user_id: str,
        loan_id: int,
        request: AmortizationRequest,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate an amortization schedule for a loan
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Verify the loan belongs to the user
    loan_response = supabase.table("loans").select("*").eq("user_id", user_id).eq("loan_id", loan_id).execute()
    check_supabase_error(loan_response, "Failed to retrieve loan")

    if not loan_response.data:
        raise HTTPException(status_code=404, detail="Loan not found or doesn't belong to user")

    # Convert values from user currency to USD if needed
    principal_usd = convert_currency(request.principal, request.currency, "USD")
    monthly_payment_usd = convert_currency(request.monthly_payment, request.currency, "USD")
    extra_payment_usd = convert_currency(request.extra_payment, request.currency, "USD")

    # Generate amortization schedule
    amortization_data = generate_amortization_schedule(
        principal=principal_usd,
        annual_rate=request.annual_rate,
        monthly_payment=monthly_payment_usd,
        extra_payment=extra_payment_usd,
        max_years=request.max_years
    )

    # Convert results back to user's currency
    schedule = []
    for entry in amortization_data["schedule"]:
        schedule.append({
            "month": entry["month"],
            "payment_date": entry["payment_date"],
            "payment": convert_currency(entry["payment"], "USD", request.currency),
            "principal_payment": convert_currency(entry["principal_payment"], "USD", request.currency),
            "interest_payment": convert_currency(entry["interest_payment"], "USD", request.currency),
            "extra_payment": convert_currency(entry["extra_payment"], "USD", request.currency),
            "remaining_balance": convert_currency(entry["remaining_balance"], "USD", request.currency)
        })

    total_interest_paid = convert_currency(amortization_data["total_interest_paid"], "USD", request.currency)

    return AmortizationResponse(
        schedule=schedule,
        total_interest_paid=total_interest_paid,
        months_to_payoff=amortization_data["months_to_payoff"]
    )

# New endpoint for managing loans
@router.post("/user/{user_id}/loans")
@handle_exceptions
async def save_user_loans(
        user_id: str,
        loans: List[Loan],
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Save or update multiple loans for a user
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Format loans for database
    formatted_loans = []
    for loan in loans:
        formatted_loans.append({
            "user_id": user_id,
            "loan_id": loan.loan_id,
            "name": loan.name,
            "balance": loan.balance,
            "interest_rate": loan.interest_rate,
            "term_years": loan.term_years,
            "minimum_payment": loan.minimum_payment,
            "loan_type": loan.loan_type,
            "updated_at": "now()"
        })

    # Get existing loan IDs
    existing_loans_response = supabase.table("loans").select("loan_id").eq("user_id", user_id).execute()
    check_supabase_error(existing_loans_response, "Failed to retrieve existing loans")

    existing_loan_ids = [loan["loan_id"] for loan in existing_loans_response.data]

    # Determine which loans to insert and which to update
    loan_ids_to_keep = [loan["loan_id"] for loan in formatted_loans]
    loan_ids_to_delete = [id for id in existing_loan_ids if id not in loan_ids_to_keep]

    # Insert or upsert loans
    if formatted_loans:
        upsert_response = supabase.table("loans").upsert(formatted_loans).execute()
        check_supabase_error(upsert_response, "Failed to save loans")

    # Delete loans that should be removed
    if loan_ids_to_delete:
        delete_response = supabase.table("loans").delete().eq("user_id", user_id).in_("loan_id", loan_ids_to_delete).execute()
        check_supabase_error(delete_response, "Failed to delete removed loans")

    return standardize_response(
        data={"saved_loans_count": len(formatted_loans), "deleted_loans_count": len(loan_ids_to_delete)},
        message="Loans saved successfully"
    )

# New endpoint for creating a default loan
@router.post("/user/{user_id}/loans/default")
@handle_exceptions
async def create_default_loan(
        user_id: str,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Create a default loan for a user if they have none
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Check if user already has loans
    existing_loans_response = supabase.table("loans").select("loan_id").eq("user_id", user_id).limit(1).execute()
    check_supabase_error(existing_loans_response, "Failed to check existing loans")

    if existing_loans_response.data and len(existing_loans_response.data) > 0:
        return standardize_response(
            message="User already has loans",
            data={"loan_exists": True}
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
    check_supabase_error(insert_response, "Failed to create default loan")

    # Format response
    created_loan = Loan(
        loan_id=default_loan["loan_id"],
        name=default_loan["name"],
        balance=default_loan["balance"],
        interest_rate=default_loan["interest_rate"],
        term_years=default_loan["term_years"],
        minimum_payment=default_loan["minimum_payment"],
        loan_type=default_loan["loan_type"]
    )

    return standardize_response(
        data=created_loan,
        message="Default loan created successfully"
    )