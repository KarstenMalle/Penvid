from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from ..utils.auth import verify_token
from ..calculations import (
    calculate_monthly_payment,
    generate_amortization_schedule,
    convert_currency
)
from ..utils.api_util import handle_exceptions, standardize_response


router = APIRouter(prefix="/api", tags=["loan_calculations"])


class Currency(str, Enum):
    USD = "USD"
    DKK = "DKK"


class LoanCalculationRequest(BaseModel):
    principal: float
    annual_rate: float
    term_years: Optional[float] = None
    monthly_payment: Optional[float] = None
    extra_payment: Optional[float] = 0
    currency: Currency = Currency.USD


class ExtraPaymentImpact(BaseModel):
    original_term: Dict[str, int]
    new_term: Dict[str, int]
    months_saved: int
    interest_saved: float


class LoanCalculationResponse(BaseModel):
    monthly_payment: float
    loan_term: Dict[str, int]
    total_interest: float
    extra_payment_impact: Optional[ExtraPaymentImpact] = None
    amortization: Optional[list] = None


@router.post("/loans/calculate", response_model=Dict[str, Any])
@handle_exceptions
async def calculate_loan_details(
        request: LoanCalculationRequest,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate various loan metrics based on provided parameters
    """
    try:
        principal = request.principal
        annual_rate = request.annual_rate  # As decimal (e.g., 0.05 for 5%)
        term_years = request.term_years
        monthly_payment = request.monthly_payment
        extra_payment = request.extra_payment
        currency = request.currency

        # If values need to be converted from user currency to USD
        if currency != Currency.USD:
            principal = convert_currency(principal, currency, "USD")
            if monthly_payment:
                monthly_payment = convert_currency(monthly_payment, currency, "USD")
            if extra_payment:
                extra_payment = convert_currency(extra_payment, currency, "USD")

        # Validate the input data
        if principal <= 0:
            return standardize_response(error="Principal amount must be greater than zero")

        # Calculate monthly payment if not provided but term is
        calculated_monthly_payment = monthly_payment
        if (not monthly_payment or monthly_payment <= 0) and term_years and term_years > 0:
            calculated_monthly_payment = calculate_monthly_payment(principal, annual_rate, term_years)

        # If we still don't have a valid monthly payment, return an error
        if not calculated_monthly_payment or calculated_monthly_payment <= 0:
            return standardize_response(error="Either monthly payment or term years must be provided")

        # Calculate loan term
        loan_term_result = calculate_loan_term(principal, annual_rate, calculated_monthly_payment)

        # Calculate total interest paid
        total_interest = calculate_total_interest_paid(principal, annual_rate, calculated_monthly_payment)

        # Calculate impact of extra payments if provided
        extra_payment_impact = None
        if extra_payment > 0:
            original_term = loan_term_result
            new_term = calculate_loan_term(principal, annual_rate, calculated_monthly_payment + extra_payment)

            months_saved = original_term["months"] - new_term["months"]

            original_interest = total_interest
            new_interest = calculate_total_interest_paid(
                principal, annual_rate, calculated_monthly_payment + extra_payment
            )

            interest_saved = original_interest - new_interest

            extra_payment_impact = {
                "original_term": original_term,
                "new_term": new_term,
                "months_saved": months_saved,
                "interest_saved": interest_saved
            }

        # Generate amortization schedule if requested
        amortization_data = None
        if monthly_payment and monthly_payment > 0:
            schedule_data = generate_amortization_schedule(
                principal, annual_rate, calculated_monthly_payment, extra_payment, max_years=30
            )
            amortization_data = schedule_data["schedule"]

            # Convert monetary values back to user's currency if needed
            if currency != Currency.USD:
                for entry in amortization_data:
                    entry["payment"] = convert_currency(entry["payment"], "USD", currency)
                    entry["principal_payment"] = convert_currency(entry["principal_payment"], "USD", currency)
                    entry["interest_payment"] = convert_currency(entry["interest_payment"], "USD", currency)
                    entry["extra_payment"] = convert_currency(entry["extra_payment"], "USD", currency)
                    entry["remaining_balance"] = convert_currency(entry["remaining_balance"], "USD", currency)

                total_interest = convert_currency(total_interest, "USD", currency)
                calculated_monthly_payment = convert_currency(calculated_monthly_payment, "USD", currency)

                if extra_payment_impact:
                    extra_payment_impact["interest_saved"] = convert_currency(
                        extra_payment_impact["interest_saved"], "USD", currency
                    )

        # Return the calculated values
        return standardize_response(data={
            "monthly_payment": calculated_monthly_payment,
            "loan_term": loan_term_result,
            "total_interest": total_interest,
            "extra_payment_impact": extra_payment_impact,
            "amortization": amortization_data
        })

    except Exception as e:
        return standardize_response(
            error=f"Error calculating loan details: {str(e)}"
        )

@router.post("/loans/amortization", response_model=Dict[str, Any])
@handle_exceptions
async def get_amortization_schedule(
        request: dict,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate a detailed amortization schedule for a loan
    """
    try:
        # Extract parameters from request
        loan_id = request.get("loan_id")
        principal = request.get("principal")
        annual_rate = request.get("annual_rate")  # As decimal (e.g., 0.05 for 5%)
        monthly_payment = request.get("monthly_payment")
        extra_payment = request.get("extra_payment", 0)
        currency = request.get("currency", "USD")

        # Validate required parameters
        if principal is None or annual_rate is None or monthly_payment is None:
            return standardize_response(
                error="Missing required parameters. Please provide principal, annual_rate, and monthly_payment."
            )

        if principal <= 0 or monthly_payment <= 0:
            return standardize_response(
                error="Principal and monthly payment must be greater than zero."
            )

        # If values need to be converted from user currency to USD
        if currency != "USD":
            principal = convert_currency(principal, currency, "USD")
            monthly_payment = convert_currency(monthly_payment, currency, "USD")
            if extra_payment:
                extra_payment = convert_currency(extra_payment, currency, "USD")

        # Generate amortization schedule
        amortization_data = generate_amortization_schedule(
            principal=principal,
            annual_rate=annual_rate,
            monthly_payment=monthly_payment,
            extra_payment=extra_payment,
            max_years=30  # Limit to 30 years for reasonable calculation time
        )

        # Convert monetary values back to user's currency if needed
        if currency != "USD":
            # Convert schedule entries
            for entry in amortization_data["schedule"]:
                entry["payment"] = convert_currency(entry["payment"], "USD", currency)
                entry["principal_payment"] = convert_currency(entry["principal_payment"], "USD", currency)
                entry["interest_payment"] = convert_currency(entry["interest_payment"], "USD", currency)
                entry["extra_payment"] = convert_currency(entry["extra_payment"], "USD", currency)
                entry["remaining_balance"] = convert_currency(entry["remaining_balance"], "USD", currency)

            # Convert summary values
            amortization_data["total_interest_paid"] = convert_currency(
                amortization_data["total_interest_paid"], "USD", currency
            )

        # Return the amortization schedule
        return standardize_response(data=amortization_data)

    except Exception as e:
        return standardize_response(
            error=f"Error generating amortization schedule: {str(e)}"
        )