from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..models import Loan, FinancialOverview, AmortizationRequest, AmortizationResponse
from ..database import get_supabase_client
from ..utils.auth import verify_token
from ..calculations import generate_amortization_schedule, convert_currency

router = APIRouter(prefix="/api", tags=["loans"])

@router.get("/user/{user_id}/financial-overview", response_model=FinancialOverview)
async def get_financial_overview(user_id: str, authenticated_user_id: str = Depends(verify_token)):
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

        if accounts_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {accounts_response.error.message}")

        # Calculate surplus as total account balances (simplified)
        surplus = sum(account['balance'] for account in accounts_response.data) if accounts_response.data else 0

        # Return financial overview
        return FinancialOverview(loans=loans, surplus_balance=surplus)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving financial data: {str(e)}")


@router.post("/user/{user_id}/loan/{loan_id}/amortization", response_model=AmortizationResponse)
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

    try:
        supabase = get_supabase_client()

        # Verify the loan belongs to the user
        loan_response = supabase.table("loans").select("*").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if loan_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loan_response.error.message}")

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

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating amortization: {str(e)}")