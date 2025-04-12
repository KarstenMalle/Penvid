# backend/app/api/loan_calculations.py
from fastapi import APIRouter, Depends, HTTPException, Body, Request
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum
import logging
from datetime import datetime

from ..utils.auth import verify_token
from ..database import get_supabase_client
from ..calculations import (
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

class CalculationRequest(BaseModel):
    loan_id: int
    extra_payment: float = 0
    max_years: int = 30

async def get_user_currency_preference(user_id: str) -> str:
    """Get user's currency preference from the profiles table consistently"""
    try:
        supabase = get_supabase_client()

        # Get currency preference from profiles table
        profile_response = supabase.table("profiles").select("currency_preference").eq("id", user_id).execute()

        if profile_response.data and profile_response.data[0].get("currency_preference"):
            return profile_response.data[0]["currency_preference"]

        # Default to USD if not found
        return "USD"
    except Exception as e:
        logger.error(f"Error getting user currency preference: {str(e)}")
        return "USD"  # Default to USD on error

@router.post("/loans/calculate")
@handle_exceptions
async def calculate_loan_details(
        request: Request,
        user_id: str = Body(..., embed=True),
        loan_id: int = Body(..., embed=True),
        extra_payment: float = Body(0, embed=True),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate various loan metrics based on loan_id
    All loan data is fetched from the database
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Fetch the loan from database
        loan_response = supabase.table("loans").select("*").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if loan_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loan_response.error.message}")

        if not loan_response.data:
            raise HTTPException(status_code=404, detail="Loan not found")

        # Extract loan details
        loan = loan_response.data[0]
        principal = loan["balance"]
        annual_rate = loan["interest_rate"]
        term_years = loan["term_years"]
        minimum_payment = loan["minimum_payment"]

        # Calculate monthly payment if not available
        calculated_monthly_payment = minimum_payment
        if not minimum_payment or minimum_payment <= 0:
            calculated_monthly_payment = calculate_monthly_payment(principal, annual_rate, term_years)

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
        if calculated_monthly_payment > 0:
            try:
                schedule_data = generate_amortization_schedule(
                    principal=principal,
                    annual_rate=annual_rate,
                    monthly_payment=calculated_monthly_payment,
                    extra_payment=extra_payment,
                    max_years=30
                )
                amortization_data = schedule_data["schedule"]
            except Exception as e:
                logger.error(f"Error generating amortization schedule: {str(e)}")
                # Continue without amortization data
                pass

        # Return the calculated values - middleware will handle currency conversion
        return standardize_response(data={
            "monthly_payment": calculated_monthly_payment,
            "loan_term": loan_term_result,
            "total_interest": total_interest,
            "extra_payment_impact": extra_payment_impact,
            "amortization": amortization_data,
            "loan_details": {
                "id": loan_id,
                "name": loan["name"],
                "balance": principal,
                "interestRate": annual_rate,
                "termYears": term_years
            }
        }, request=request)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating loan details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating loan details: {str(e)}")

@router.post("/loans/{loan_id}/amortization")
@handle_exceptions
async def get_amortization_schedule(
        request: Request,
        loan_id: int,
        user_id: str = Body(..., embed=True),
        extra_payment: float = Body(0, embed=True),
        max_years: int = Body(30, embed=True),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate a detailed amortization schedule for a loan by ID
    All loan data is fetched from the database
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Fetch the loan from database
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

        # Validate required parameters
        if principal <= 0 or monthly_payment <= 0:
            return standardize_response(
                error="Principal and monthly payment must be greater than zero.",
                request=request
            )

        # Log the inputs for debugging
        logger.info(f"Generating amortization schedule: principal={principal}, rate={annual_rate}%, payment={monthly_payment}")

        # Generate amortization schedule
        amortization_data = generate_amortization_schedule(
            principal=principal,
            annual_rate=annual_rate,
            monthly_payment=monthly_payment,
            extra_payment=extra_payment,
            max_years=max_years
        )

        # Log the calculation results
        logger.info(f"Amortization result: months={amortization_data['months_to_payoff']}, interest={amortization_data['total_interest_paid']}")

        # Calculate payment analysis
        payoff_date = datetime.now()
        if amortization_data["months_to_payoff"] > 0:
            payoff_date = datetime.now().replace(
                year=datetime.now().year + (amortization_data["months_to_payoff"] // 12),
                month=datetime.now().month + (amortization_data["months_to_payoff"] % 12)
            )
            # Adjust if month overflow
            if payoff_date.month > 12:
                payoff_date = payoff_date.replace(year=payoff_date.year + 1, month=payoff_date.month - 12)

        # Add payment analysis to the response
        response_data = {
            "schedule": amortization_data["schedule"],
            "total_interest_paid": amortization_data["total_interest_paid"],
            "months_to_payoff": amortization_data["months_to_payoff"],
            "payment_analysis": {
                "loanId": loan_id,
                "loanName": loan["name"],
                "initialBalance": principal,
                "currentBalance": principal,
                "interestRate": annual_rate,
                "monthlyPayment": monthly_payment,
                "extraMonthlyPayment": extra_payment,
                "totalPayments": amortization_data["months_to_payoff"],
                "estimatedPayoffDate": payoff_date.strftime("%Y-%m-%d"),
                "totalPaid": principal + amortization_data["total_interest_paid"],
                "totalInterest": amortization_data["total_interest_paid"],
                "totalPrincipal": principal,
                "interestToBalanceRatio": amortization_data["total_interest_paid"] / principal if principal > 0 else 0,
                "monthlyInterest": principal * (annual_rate / 100 / 12),
                "loanType": loan.get("loan_type", "OTHER")
            }
        }

        # Return amortization schedule - middleware will handle currency conversion
        return standardize_response(data=response_data, request=request)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating amortization schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating amortization schedule: {str(e)}")

@router.post("/loans/payment-analysis")
@handle_exceptions
async def payment_analysis(
        request: Request,
        user_id: str = Body(..., embed=True),
        loan_id: int = Body(..., embed=True),
        extra_payment: float = Body(0, embed=True),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Generate payment analysis for a loan
    This is a specialized endpoint focused on payment metrics
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Fetch the loan from database
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
        term_years = loan["term_years"]

        # Calculate baseline amortization
        baseline_schedule = generate_amortization_schedule(
            principal=principal,
            annual_rate=annual_rate,
            monthly_payment=monthly_payment,
            extra_payment=0
        )

        # Calculate with extra payment if provided
        extra_payment_schedule = None
        if extra_payment > 0:
            extra_payment_schedule = generate_amortization_schedule(
                principal=principal,
                annual_rate=annual_rate,
                monthly_payment=monthly_payment,
                extra_payment=extra_payment
            )

        # Calculate payoff date
        payoff_date = datetime.now()
        months_to_payoff = baseline_schedule["months_to_payoff"]
        if months_to_payoff > 0:
            payoff_date = datetime.now().replace(
                year=datetime.now().year + (months_to_payoff // 12),
                month=datetime.now().month + (months_to_payoff % 12)
            )
            # Adjust if month overflow
            if payoff_date.month > 12:
                payoff_date = payoff_date.replace(year=payoff_date.year + 1, month=payoff_date.month - 12)

        # Calculate other metrics
        monthly_interest = principal * (annual_rate / 100 / 12)
        total_interest = baseline_schedule["total_interest_paid"]
        total_payments = monthly_payment * baseline_schedule["months_to_payoff"]
        total_paid = principal + total_interest

        # Create response
        payment_analysis = {
            "loanId": loan_id,
            "loanName": loan["name"],
            "loanType": loan.get("loan_type", "OTHER"),
            "initialBalance": principal,
            "currentBalance": principal,
            "interestRate": annual_rate,
            "termYears": term_years,
            "monthlyPayment": monthly_payment,
            "totalPayments": baseline_schedule["months_to_payoff"],
            "estimatedPayoffDate": payoff_date.strftime("%Y-%m-%d"),
            "totalPaid": total_paid,
            "totalInterest": total_interest,
            "totalPrincipal": principal,
            "interestToBalanceRatio": total_interest / principal if principal > 0 else 0,
            "monthlyInterest": monthly_interest
        }

        # Add extra payment analysis if applicable
        if extra_payment_schedule:
            payment_analysis["extraPaymentAnalysis"] = {
                "extraMonthlyPayment": extra_payment,
                "payoffWithExtraPayments": extra_payment_schedule["months_to_payoff"],
                "monthsSaved": baseline_schedule["months_to_payoff"] - extra_payment_schedule["months_to_payoff"],
                "interestSaved": baseline_schedule["total_interest_paid"] - extra_payment_schedule["total_interest_paid"],
                "totalPaidWithExtraPayments": principal + extra_payment_schedule["total_interest_paid"]
            }

        # Return payment analysis - middleware will handle currency conversion
        return standardize_response(data=payment_analysis, request=request)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating payment analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating payment analysis: {str(e)}")

@router.post("/loans/batch-calculate")
@handle_exceptions
async def batch_calculate_loans(
        request: Request,
        user_id: str = Body(..., embed=True),
        loan_ids: List[int] = Body(..., embed=True),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate details for multiple loans at once
    Useful for dashboard views and comparisons
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Fetch the loans from database
        loans_response = supabase.table("loans").select("*").eq("user_id", user_id).in_("loan_id", loan_ids).execute()

        if loans_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loans_response.error.message}")

        # Process each loan
        loan_calculations = []
        for loan in loans_response.data:
            principal = loan["balance"]
            annual_rate = loan["interest_rate"]
            monthly_payment = loan["minimum_payment"]
            term_years = loan["term_years"]

            # Skip invalid loans
            if principal <= 0 or monthly_payment <= 0:
                continue

            # Calculate basic metrics
            loan_term_result = calculate_loan_term(principal, annual_rate, monthly_payment)
            total_interest = calculate_total_interest_paid(principal, annual_rate, monthly_payment)

            loan_calculations.append({
                "loan_id": loan["loan_id"],
                "name": loan["name"],
                "loan_type": loan.get("loan_type", "OTHER"),
                "balance": principal,
                "interest_rate": annual_rate,
                "monthly_payment": monthly_payment,
                "term_years": term_years,
                "months_to_payoff": loan_term_result["months"],
                "total_interest": total_interest,
                "total_paid": principal + total_interest,
                "monthly_interest": principal * (annual_rate / 100 / 12)
            })

        # Return batch calculations - middleware will handle currency conversion
        return standardize_response(data=loan_calculations, request=request)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing batch calculation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error performing batch calculation: {str(e)}")

@router.post("/loans/what-if-scenarios")
@handle_exceptions
async def what_if_scenarios(
        request: Request,
        user_id: str = Body(..., embed=True),
        loan_id: int = Body(..., embed=True),
        scenarios: List[Dict[str, Any]] = Body(..., embed=True),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate multiple what-if scenarios for a loan
    Each scenario can modify different loan parameters
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Fetch the loan from database
        loan_response = supabase.table("loans").select("*").eq("user_id", user_id).eq("loan_id", loan_id).execute()

        if loan_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {loan_response.error.message}")

        if not loan_response.data:
            raise HTTPException(status_code=404, detail="Loan not found")

        # Get user's currency preference
        currency_preference = await get_user_currency_preference(user_id)

        # Get base loan details
        loan = loan_response.data[0]
        base_principal = loan["balance"]
        base_rate = loan["interest_rate"]
        base_payment = loan["minimum_payment"]

        # Run each scenario
        scenario_results = []
        for i, scenario in enumerate(scenarios):
            # Apply scenario parameters or use base values
            principal = scenario.get("principal", base_principal)
            rate = scenario.get("interest_rate", base_rate)
            payment = scenario.get("monthly_payment", base_payment)
            extra = scenario.get("extra_payment", 0)

            # Convert any parameters that might be in user's currency to USD for calculations
            if currency_preference != "USD":
                if "principal" in scenario:
                    principal = convert_currency(principal, currency_preference, "USD")
                if "monthly_payment" in scenario:
                    payment = convert_currency(payment, currency_preference, "USD")
                if "extra_payment" in scenario:
                    extra = convert_currency(extra, currency_preference, "USD")

            # Calculate results for this scenario
            term_result = calculate_loan_term(principal, rate, payment)
            total_interest = calculate_total_interest_paid(principal, rate, payment)

            # If extra payment provided, calculate impact
            extra_impact = None
            if extra > 0:
                extra_impact = calculate_extra_payment_impact(principal, rate, payment, extra)

                # Use accelerated values if extra payment provided
                months_to_payoff = extra_impact["new_term"]["months"]
                total_interest_paid = total_interest - extra_impact["interest_saved"]
            else:
                months_to_payoff = term_result["months"]
                total_interest_paid = total_interest

            # Format the scenario result
            scenario_results.append({
                "scenario_id": i + 1,
                "name": scenario.get("name", f"Scenario {i+1}"),
                "principal": principal,
                "interest_rate": rate,
                "monthly_payment": payment,
                "extra_payment": extra,
                "months_to_payoff": months_to_payoff,
                "years_to_payoff": months_to_payoff / 12 if months_to_payoff != float('inf') else float('inf'),
                "total_interest": total_interest_paid,
                "total_paid": principal + total_interest_paid,
                "monthly_interest": principal * (rate / 100 / 12),
                "extra_payment_impact": extra_impact
            })

        # Return scenario results - middleware will handle currency conversion
        return standardize_response(data={
            "loan_id": loan_id,
            "loan_name": loan["name"],
            "base_scenario": {
                "principal": base_principal,
                "interest_rate": base_rate,
                "monthly_payment": base_payment
            },
            "scenarios": scenario_results
        }, request=request)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating what-if scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating what-if scenarios: {str(e)}")