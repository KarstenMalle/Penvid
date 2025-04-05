# backend/app/api/loan_calculations.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import logging

from ..utils.auth import verify_token
# Fix the import - ensure all required functions are properly imported
from app.calculations import (
    calculate_monthly_payment,
    calculate_loan_term,
    calculate_total_interest_paid,
    calculate_extra_payment_impact,
    generate_amortization_schedule,
    convert_currency
)

from ..utils.api_util import handle_exceptions, standardize_response

# Configure logging for this module
logger = logging.getLogger(__name__)

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


class AmortizationRequest(BaseModel):
    principal: float
    annual_rate: float
    monthly_payment: float
    extra_payment: float = 0
    max_years: int = 30
    currency: Currency = Currency.USD


class ExtraPaymentImpact(BaseModel):
    original_term: Dict[str, int]
    new_term: Dict[str, int]
    months_saved: int
    interest_saved: float


class LoanCalculationResponse(BaseModel):
    monthly_payment: float
    loan_term: Dict[str, float]
    total_interest: float
    extra_payment_impact: Optional[ExtraPaymentImpact] = None
    amortization: Optional[list] = None


@router.post("/loans/calculate")
@handle_exceptions
async def calculate_loan_details(
        request: LoanCalculationRequest,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate various loan metrics based on provided parameters
    """
    try:
        # Extract request data
        principal = request.principal
        annual_rate = request.annual_rate  # As percentage (e.g., 5.0 for 5%)
        term_years = request.term_years
        monthly_payment = request.monthly_payment
        extra_payment = request.extra_payment or 0
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
            extra_payment_impact = calculate_extra_payment_impact(
                principal, annual_rate, calculated_monthly_payment, extra_payment
            )

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
        import traceback
        traceback.print_exc()  # Print full traceback for debugging
        logger.error(f"Error calculating loan details: {str(e)}")
        return standardize_response(
            error=f"Error calculating loan details: {str(e)}"
        )


@router.post("/loans/amortization")
@handle_exceptions
async def get_amortization_schedule(
        request: AmortizationRequest,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate a detailed amortization schedule for a loan
    """
    try:
        # Extract parameters from request
        principal = request.principal
        annual_rate = request.annual_rate
        monthly_payment = request.monthly_payment
        extra_payment = request.extra_payment
        max_years = request.max_years
        currency = request.currency

        # Validate required parameters
        if principal <= 0 or monthly_payment <= 0:
            return standardize_response(
                error="Principal and monthly payment must be greater than zero."
            )

        # If values need to be converted from user currency to USD
        if currency != Currency.USD:
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
            max_years=max_years
        )

        # Convert monetary values back to user's currency if needed
        if currency != Currency.USD:
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
        import traceback
        traceback.print_exc()  # Print full traceback for debugging
        logger.error(f"Error generating amortization schedule: {str(e)}")
        return standardize_response(
            error=f"Error generating amortization schedule: {str(e)}"
        )


# Add the endpoint for loan-specific amortization schedule
@router.post("/loans/{loan_id}/amortization")
@handle_exceptions
async def get_loan_amortization_schedule(
        loan_id: int,
        request: AmortizationRequest,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate a detailed amortization schedule for a specific loan
    """
    try:
        # Extract parameters from request
        principal = request.principal
        annual_rate = request.annual_rate  # Already as percentage (e.g., 5.0 for 5%)
        monthly_payment = request.monthly_payment
        extra_payment = request.extra_payment
        max_years = request.max_years
        currency = request.currency

        # Validate required parameters
        if principal <= 0:
            return standardize_response(
                error="Principal must be greater than zero."
            )

        if monthly_payment <= 0:
            return standardize_response(
                error="Monthly payment must be greater than zero."
            )

        # Convert values to USD for calculation if needed
        if currency != "USD":
            principal = convert_currency(principal, currency, "USD")
            monthly_payment = convert_currency(monthly_payment, currency, "USD")
            if extra_payment:
                extra_payment = convert_currency(extra_payment, currency, "USD")

        # Log the received parameters for debugging
        logger.info(f"Generating amortization schedule: principal={principal}, rate={annual_rate}%, payment={monthly_payment}")

        # Generate amortization schedule
        amortization_data = generate_amortization_schedule(
            principal=principal,
            annual_rate=annual_rate,  # Pass the rate as percentage
            monthly_payment=monthly_payment,
            extra_payment=extra_payment,
            max_years=max_years
        )

        # Log the calculation results
        logger.info(f"Amortization result: months={amortization_data['months_to_payoff']}, interest={amortization_data['total_interest_paid']}")

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
        import traceback
        traceback.print_exc()  # Print full traceback for debugging
        logger.error(f"Error generating loan amortization schedule: {str(e)}")
        return standardize_response(
            error=f"Error generating loan amortization schedule: {str(e)}"
        )