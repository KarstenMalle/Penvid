import numpy as np
import numpy_financial as npf
import pandas as pd
import requests
from typing import List, Dict, Any, Optional
from cachetools import cached, TTLCache
from datetime import datetime, timedelta

# Cache for exchange rates, with 24-hour TTL
exchange_rate_cache = TTLCache(maxsize=100, ttl=86400)


def calculate_monthly_payment(principal: float, annual_rate: float, years: float) -> float:
    """Calculate monthly payment for a loan."""
    if principal <= 0 or years <= 0:
        return 0

    monthly_rate = annual_rate / 12
    num_payments = years * 12

    if monthly_rate == 0:
        return principal / num_payments

    return -npf.pmt(monthly_rate, num_payments, principal)


def generate_amortization_schedule(
        principal: float,
        annual_rate: float,
        monthly_payment: float,
        extra_payment: float = 0,
        max_years: int = 30
) -> Dict[str, Any]:
    """
    Generate a detailed amortization schedule with regular and extra payments.

    Args:
        principal: Loan principal amount
        annual_rate: Annual interest rate (as decimal, e.g., 0.05 for 5%)
        monthly_payment: Regular monthly payment
        extra_payment: Additional payment each month
        max_years: Maximum years to calculate (to prevent infinite loops)

    Returns:
        Dictionary with schedule, total interest, and months to payoff
    """
    if principal <= 0 or monthly_payment <= 0:
        return {"schedule": [], "total_interest_paid": 0, "months_to_payoff": 0}

    monthly_rate = annual_rate / 12
    balance = principal
    month = 0
    total_interest = 0
    schedule = []

    # Maximum number of payments to prevent infinite loops
    max_payments = max_years * 12

    # Start date for payments
    start_date = datetime.now()

    while balance > 0 and month < max_payments:
        # Calculate interest for this period
        interest_payment = balance * monthly_rate
        total_interest += interest_payment

        # Calculate amount going to principal
        principal_payment = min(monthly_payment - interest_payment, balance)

        # Add extra payment if available
        if extra_payment > 0:
            extra_payment_applied = min(extra_payment, balance - principal_payment)
            principal_payment += extra_payment_applied
        else:
            extra_payment_applied = 0

        # Update balance
        remaining_balance = balance - principal_payment

        # Calculate date for this payment
        payment_date = start_date + timedelta(days=30 * (month + 1))

        # Add to schedule
        schedule.append({
            "month": month + 1,
            "payment_date": payment_date.strftime('%Y-%m-%d'),
            "payment": monthly_payment + extra_payment_applied,
            "principal_payment": principal_payment,
            "interest_payment": interest_payment,
            "extra_payment": extra_payment_applied,
            "remaining_balance": remaining_balance
        })

        # Update for next iteration
        balance = remaining_balance
        month += 1

        # Break if balance is very close to zero
        if balance < 0.01:
            balance = 0

    return {
        "schedule": schedule,
        "total_interest_paid": total_interest,
        "months_to_payoff": month
    }


def calculate_investment_projection(
        monthly_amount: float,
        annual_return: float,
        months: int,
        inflation_rate: float = 0.025,
        risk_factor: float = 0.2
) -> Dict[str, Any]:
    """
    Calculate investment growth with adjustments for inflation and risk.

    Args:
        monthly_amount: Monthly contribution
        annual_return: Expected annual return (as decimal)
        months: Number of months to project
        inflation_rate: Annual inflation rate (as decimal)
        risk_factor: Risk adjustment factor (0-1, higher means more risk adjustment)

    Returns:
        Dictionary with projection data and summary statistics
    """
    if monthly_amount <= 0 or months <= 0:
        return {
            "projection": [],
            "final_balance": 0,
            "inflation_adjusted_final_balance": 0,
            "risk_adjusted_balance": 0
        }

    # Convert annual rates to monthly
    monthly_return = annual_return / 12
    monthly_inflation = inflation_rate / 12

    # Create arrays to store results
    projection = []
    balance = 0
    inflation_factor = 1

    # Start date for projection
    start_date = datetime.now()

    for month in range(1, months + 1):
        # Grow existing balance
        balance = balance * (1 + monthly_return)

        # Add monthly contribution
        balance += monthly_amount

        # Update inflation factor (compounds over time)
        inflation_factor *= (1 + monthly_inflation)

        # Calculate inflation-adjusted value
        inflation_adjusted_balance = balance / inflation_factor

        # Calculate risk-adjusted value (simplified approach)
        # The higher the risk factor, the more we discount future returns
        risk_discount = balance * (month / months) * (risk_factor / 10)
        risk_adjusted_balance = balance - risk_discount

        # Calculate date for this month
        projection_date = start_date + timedelta(days=30 * month)

        # Add to projection
        projection.append({
            "month": month,
            "date": projection_date.strftime('%Y-%m-%d'),
            "balance": balance,
            "inflation_adjusted_balance": inflation_adjusted_balance,
            "risk_adjusted_balance": risk_adjusted_balance
        })

    # Final values
    final_balance = balance
    inflation_adjusted_final_balance = balance / inflation_factor
    risk_adjusted_final_balance = balance - (balance * risk_factor)

    return {
        "projection": projection,
        "final_balance": final_balance,
        "inflation_adjusted_final_balance": inflation_adjusted_final_balance,
        "risk_adjusted_balance": risk_adjusted_final_balance
    }


def calculate_financial_strategy_comparison(
        loans: List[Dict[str, Any]],
        monthly_surplus: float,
        annual_investment_return: float = 0.07,
        inflation_rate: float = 0.025,
        risk_factor: float = 0.2
) -> Dict[str, Any]:
    """
    Compare strategies for allocating extra money between loan payments and investments.

    Args:
        loans: List of loan details with principal, rate, etc.
        monthly_surplus: Monthly amount available after minimum payments
        annual_investment_return: Expected annual return on investments
        inflation_rate: Expected annual inflation rate
        risk_factor: Risk adjustment factor

    Returns:
        Dictionary with strategy comparison results
    """
    if not loans or monthly_surplus <= 0:
        return {
            "recommendation": {
                "best_strategy": "No Recommendation",
                "reason": "Insufficient data or no surplus available",
                "interest_savings": 0,
                "months_saved": 0,
                "investment_value_after_loan_payoff": 0,
                "investment_value_immediate_invest": 0,
                "total_savings_advantage": 0
            }
        }

    strategies_results = {}

    # Sort loans by interest rate (highest first)
    sorted_loans = sorted(loans, key=lambda x: x['interest_rate'], reverse=True)
    priority_loan = sorted_loans[0]  # Highest interest loan

    # Strategy A: Pay extra on highest interest loan, then invest after payoff
    # First, calculate how long it takes to pay off with extra payments
    loan_minimum_payment = priority_loan.get('minimum_payment', 0)
    loan_balance = priority_loan.get('balance', 0)
    loan_rate = priority_loan.get('interest_rate', 0)

    # Generate amortization schedule with extra payments
    amortization_with_extra = generate_amortization_schedule(
        principal=loan_balance,
        annual_rate=loan_rate,
        monthly_payment=loan_minimum_payment,
        extra_payment=monthly_surplus
    )

    # Generate baseline amortization schedule (minimum payments only)
    baseline_amortization = generate_amortization_schedule(
        principal=loan_balance,
        annual_rate=loan_rate,
        monthly_payment=loan_minimum_payment
    )

    # Calculate interest savings and time savings
    interest_savings = baseline_amortization['total_interest_paid'] - amortization_with_extra['total_interest_paid']
    months_saved = baseline_amortization['months_to_payoff'] - amortization_with_extra['months_to_payoff']

    # Calculate investment growth after loan payoff
    # Invest the entire payment + surplus for the remaining original term
    investment_after_payoff = calculate_investment_projection(
        monthly_amount=loan_minimum_payment + monthly_surplus,
        annual_return=annual_investment_return,
        months=months_saved,
        inflation_rate=inflation_rate,
        risk_factor=risk_factor
    )

    # Strategy B: Minimum payments only, invest surplus right away
    investment_immediate = calculate_investment_projection(
        monthly_amount=monthly_surplus,
        annual_return=annual_investment_return,
        months=baseline_amortization['months_to_payoff'],
        inflation_rate=inflation_rate,
        risk_factor=risk_factor
    )

    # Determine best strategy
    strategy_a_value = interest_savings + investment_after_payoff['risk_adjusted_balance']
    strategy_b_value = investment_immediate['risk_adjusted_balance']

    best_strategy = "Extra Payments First" if strategy_a_value > strategy_b_value else "Invest Surplus First"
    advantage_amount = abs(strategy_a_value - strategy_b_value)

    # Determine reason based on loan interest vs investment return
    reason = ""
    if loan_rate > annual_investment_return * (1 - risk_factor):
        reason = f"Loan interest rate ({loan_rate:.1%}) exceeds risk-adjusted investment return ({annual_investment_return * (1 - risk_factor):.1%})"
    else:
        reason = f"Risk-adjusted investment return ({annual_investment_return * (1 - risk_factor):.1%}) exceeds loan interest rate ({loan_rate:.1%})"

    return {
        "recommendation": {
            "best_strategy": best_strategy,
            "reason": reason,
            "interest_savings": interest_savings,
            "months_saved": months_saved,
            "investment_value_after_loan_payoff": investment_after_payoff['risk_adjusted_balance'],
            "investment_value_immediate_invest": investment_immediate['risk_adjusted_balance'],
            "total_savings_advantage": advantage_amount
        },
        "loan_details": {
            "name": priority_loan.get('name', 'Highest Interest Loan'),
            "interest_rate": loan_rate,
            "payoff_months_with_extra": amortization_with_extra['months_to_payoff'],
            "payoff_months_minimum": baseline_amortization['months_to_payoff']
        },
        "amortization_comparison": {
            "baseline": {
                "total_interest": baseline_amortization['total_interest_paid'],
                "months_to_payoff": baseline_amortization['months_to_payoff']
            },
            "with_extra_payments": {
                "total_interest": amortization_with_extra['total_interest_paid'],
                "months_to_payoff": amortization_with_extra['months_to_payoff']
            }
        },
        "investment_comparison": {
            "immediate_investment": {
                "final_balance": investment_immediate['final_balance'],
                "risk_adjusted_balance": investment_immediate['risk_adjusted_balance']
            },
            "investment_after_payoff": {
                "final_balance": investment_after_payoff['final_balance'],
                "risk_adjusted_balance": investment_after_payoff['risk_adjusted_balance']
            }
        }
    }


@cached(cache=exchange_rate_cache)
def get_exchange_rates(base_currency="USD"):
    """Fetch exchange rates from an API with caching"""
    try:
        url = f"https://api.exchangerate-api.com/v4/latest/{base_currency}"
        response = requests.get(url)
        data = response.json()
        return data.get('rates', {"USD": 1.0, "DKK": 6.8991310126})
    except Exception as e:
        print(f"Error fetching exchange rates: {e}")
        # Fallback rates
        return {"USD": 1.0, "DKK": 6.8991310126}


def convert_currency(amount: float, from_currency: str = "USD", to_currency: str = "USD") -> float:
    """Convert amount between currencies"""
    if from_currency == to_currency:
        return amount

    rates = get_exchange_rates(base_currency="USD")

    # Convert to USD as an intermediate step if needed
    if from_currency != "USD":
        amount = amount / rates.get(from_currency, 1.0)

    # Convert from USD to target currency
    if to_currency != "USD":
        amount = amount * rates.get(to_currency, 1.0)

    return amount