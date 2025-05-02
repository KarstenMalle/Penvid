# backend/app/api/loan_calculations.py
# (Update the existing file)

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum
import logging

from ..utils.auth import verify_token
from ..calculations import (
    calculate_monthly_payment,
    calculate_loan_term,
    calculate_total_interest_paid,
    calculate_extra_payment_impact,
    generate_amortization_schedule
)
from ..services.currency_service import CurrencyService
from ..utils.api_util import handle_exceptions, standardize_response

# Configure logging for this module
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["loan_calculations"])

class Currency(str, Enum):
    USD = "USD"
    DKK = "DKK"

# Add a new function to handle conversion of all monetary fields in amortization data
def convert_amortization_data(data: Dict[str, Any], from_currency: str, to_currency: str) -> Dict[str, Any]:
    """Convert all monetary values in amortization data from one currency to another"""
    result = {**data}

    # Convert total interest paid
    if "total_interest_paid" in result:
        result["total_interest_paid"] = CurrencyService.convert_currency(
            result["total_interest_paid"], from_currency, to_currency
        )

    # Convert schedule entries
    if "schedule" in result:
        for entry in result["schedule"]:
            monetary_fields = ["payment", "principal_payment", "interest_payment",
                               "extra_payment", "remaining_balance"]

            for field in monetary_fields:
                if field in entry:
                    entry[field] = CurrencyService.convert_currency(
                        entry[field], from_currency, to_currency
                    )

    return result

@router.post("/loans/calculate")
@handle_exceptions
async def calculate_loan_details(
        request: Dict[str, Any] = Body(...),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate various loan metrics based on provided parameters
    """
    try:
        # Extract request data
        principal = request.get("principal", 0)
        annual_rate = request.get("annual_rate", 0)  # As percentage (e.g., 5.0 for 5%)
        term_years = request.get("term_years")
        monthly_payment = request.get("monthly_payment")
        extra_payment = request.get("extra_payment", 0)
        currency = request.get("currency", "USD")

        # If values need to be converted to USD for calculation
        if currency != "USD":
            principal = CurrencyService.convert_currency(principal, currency, "USD")
            if monthly_payment:
                monthly_payment = CurrencyService.convert_currency(monthly_payment, currency, "USD")
            if extra_payment:
                extra_payment = CurrencyService.convert_currency(extra_payment, currency, "USD")

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

        # Convert results back to requested currency if needed
        if currency != "USD":
            # Convert calculated monthly payment
            calculated_monthly_payment = CurrencyService.convert_currency(
                calculated_monthly_payment, "USD", currency
            )

            # Convert total interest
            total_interest = CurrencyService.convert_currency(
                total_interest, "USD", currency
            )

            # Convert extra payment impact if it exists
            if extra_payment_impact:
                extra_payment_impact["interest_saved"] = CurrencyService.convert_currency(
                    extra_payment_impact["interest_saved"], "USD", currency
                )

            # Convert amortization data
            if amortization_data:
                for entry in amortization_data:
                    entry["payment"] = CurrencyService.convert_currency(entry["payment"], "USD", currency)
                    entry["principal_payment"] = CurrencyService.convert_currency(entry["principal_payment"], "USD", currency)
                    entry["interest_payment"] = CurrencyService.convert_currency(entry["interest_payment"], "USD", currency)
                    entry["extra_payment"] = CurrencyService.convert_currency(entry["extra_payment"], "USD", currency)
                    entry["remaining_balance"] = CurrencyService.convert_currency(entry["remaining_balance"], "USD", currency)

        # Return the calculated values
        return standardize_response(data={
            "monthly_payment": calculated_monthly_payment,
            "loan_term": loan_term_result,
            "total_interest": total_interest,
            "extra_payment_impact": extra_payment_impact,
            "amortization": amortization_data
        })

    except Exception as e:
        logger.error(f"Error calculating loan details: {str(e)}")
        return standardize_response(
            error=f"Error calculating loan details: {str(e)}"
        )

@router.post("/loans/amortization")
@handle_exceptions
async def get_amortization_schedule(
        request: Dict[str, Any] = Body(...),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate a detailed amortization schedule for a loan
    """
    try:
        # Extract parameters from request
        principal = request.get("principal", 0)
        annual_rate = request.get("annual_rate", 0)
        monthly_payment = request.get("monthly_payment", 0)
        extra_payment = request.get("extra_payment", 0)
        max_years = request.get("max_years", 30)
        currency = request.get("currency", "USD")

        # Validate required parameters
        if principal <= 0 or monthly_payment <= 0:
            return standardize_response(
                error="Principal and monthly payment must be greater than zero."
            )

        # Convert values to USD for calculation if needed
        if currency != "USD":
            principal = CurrencyService.convert_currency(principal, currency, "USD")
            monthly_payment = CurrencyService.convert_currency(monthly_payment, currency, "USD")
            if extra_payment:
                extra_payment = CurrencyService.convert_currency(extra_payment, currency, "USD")

        # Generate amortization schedule
        amortization_data = generate_amortization_schedule(
            principal=principal,
            annual_rate=annual_rate,
            monthly_payment=monthly_payment,
            extra_payment=extra_payment,
            max_years=max_years
        )

        # Convert monetary values back to user's currency if needed
        if currency != "USD":
            amortization_data = convert_amortization_data(amortization_data, "USD", currency)

        # Return the amortization schedule
        return standardize_response(data=amortization_data)

    except Exception as e:
        logger.error(f"Error generating amortization schedule: {str(e)}")
        return standardize_response(
            error=f"Error generating amortization schedule: {str(e)}"
        )