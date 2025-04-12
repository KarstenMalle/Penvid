import numpy as np
import numpy_financial as npf
import requests
from typing import List, Dict, Any, Optional
from cachetools import cached, TTLCache
from datetime import datetime, timedelta
import logging
import math

# Set up module-level logger
calc_logger = logging.getLogger(__name__)

# Cache for exchange rates, with 24-hour TTL
exchange_rate_cache = TTLCache(maxsize=100, ttl=86400)
# Cache for strategy calculations
strategy_cache = TTLCache(maxsize=100, ttl=3600)  # 1 hour TTL

def calculate_monthly_payment(principal: float, annual_rate: float, years: float) -> float:
    """Calculate monthly payment for a loan."""
    if principal <= 0 or years <= 0:
        return 0

    monthly_rate = annual_rate / 12 / 100  # Convert annual rate to monthly decimal
    num_payments = years * 12

    if monthly_rate == 0:
        return principal / num_payments

    return -npf.pmt(monthly_rate, num_payments, principal)


def calculate_loan_term(principal: float, annual_rate: float, monthly_payment: float) -> dict:
    """
    Calculate the time it will take to pay off a loan

    Args:
        principal: Loan principal amount
        annual_rate: Annual interest rate (as percentage, e.g., 5.0 for 5%)
        monthly_payment: Monthly payment amount

    Returns:
        Dictionary with months and years to payoff
    """
    if principal <= 0 or monthly_payment <= 0:
        return {"months": 0, "years": 0}

    monthly_rate = annual_rate / 100 / 12  # Convert to monthly decimal

    # If interest rate is 0, simple division
    if monthly_rate == 0:
        months = principal / monthly_payment
        return {"months": int(months), "years": round(months / 12, 2)}

    # If monthly payment is too small to cover interest
    if monthly_payment <= principal * monthly_rate:
        return {"months": float('inf'), "years": float('inf')}

    # Calculate using standard formula
    # n = -log(1 - (P*r)/PMT) / log(1+r)
    # where: n = number of payments, P = principal, r = monthly rate, PMT = payment
    n = -math.log(1 - (principal * monthly_rate) / monthly_payment) / math.log(1 + monthly_rate)

    # Round up to nearest month
    months = math.ceil(n)
    years = round(n / 12, 2)

    return {"months": months, "years": years}


def calculate_total_interest_paid(principal: float, annual_rate: float, monthly_payment: float) -> float:
    """
    Calculate the total interest paid over the life of a loan

    Args:
        principal: Loan principal amount
        annual_rate: Annual interest rate (as percentage, e.g., 5.0 for 5%)
        monthly_payment: Monthly payment amount

    Returns:
        Total interest paid
    """
    if principal <= 0 or monthly_payment <= 0:
        return 0

    monthly_rate = annual_rate / 100 / 12  # Convert to monthly decimal

    # If monthly payment is too small to cover interest
    if monthly_payment <= principal * monthly_rate:
        return float('inf')  # Will never be paid off

    # Get term in months
    loan_term = calculate_loan_term(principal, annual_rate, monthly_payment)
    months = loan_term["months"]

    # Calculate total interest (total payments - principal)
    total_payments = monthly_payment * months
    total_interest = total_payments - principal

    return max(0, total_interest)  # Ensure non-negative


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
        annual_rate: Annual interest rate (as percentage, e.g., 5.0 for 5%)
        monthly_payment: Regular monthly payment
        extra_payment: Additional payment each month
        max_years: Maximum years to calculate (to prevent infinite loops)

    Returns:
        Dictionary with schedule, total interest, and months to payoff
    """
    if principal <= 0 or monthly_payment <= 0:
        return {"schedule": [], "total_interest_paid": 0, "months_to_payoff": 0}

    # Convert percentage to decimal
    monthly_rate = annual_rate / 100 / 12
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

        # Calculate amount going to principal (handle case where payment is less than interest)
        if monthly_payment <= interest_payment:
            principal_payment = 0
            # If payment can't cover interest, add unpaid interest to principal
            balance += (interest_payment - monthly_payment)
            interest_payment = monthly_payment
        else:
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


def calculate_extra_payment_impact(
        principal: float,
        annual_rate: float,
        monthly_payment: float,
        extra_payment: float
) -> Dict[str, Any]:
    """
    Calculate the impact of making extra payments on a loan.

    Args:
        principal: Loan principal amount
        annual_rate: Annual interest rate as percentage (e.g., 5.0 for 5%)
        monthly_payment: Regular monthly payment
        extra_payment: Additional monthly payment

    Returns:
        Dictionary with original term, new term, months saved, and interest saved
    """
    if principal <= 0 or monthly_payment <= 0 or extra_payment <= 0:
        return {
            "original_term": {"months": 0, "years": 0},
            "new_term": {"months": 0, "years": 0},
            "months_saved": 0,
            "interest_saved": 0
        }

    # Calculate regular loan term and interest
    regular_schedule = generate_amortization_schedule(
        principal=principal,
        annual_rate=annual_rate,
        monthly_payment=monthly_payment
    )

    # Calculate accelerated loan term and interest
    accelerated_schedule = generate_amortization_schedule(
        principal=principal,
        annual_rate=annual_rate,
        monthly_payment=monthly_payment,
        extra_payment=extra_payment
    )

    # Calculate months saved and interest saved
    months_saved = regular_schedule["months_to_payoff"] - accelerated_schedule["months_to_payoff"]
    interest_saved = regular_schedule["total_interest_paid"] - accelerated_schedule["total_interest_paid"]

    return {
        "original_term": {
            "months": regular_schedule["months_to_payoff"],
            "years": round(regular_schedule["months_to_payoff"] / 12, 2)
        },
        "new_term": {
            "months": accelerated_schedule["months_to_payoff"],
            "years": round(accelerated_schedule["months_to_payoff"] / 12, 2)
        },
        "months_saved": months_saved,
        "interest_saved": interest_saved
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


@cached(cache=exchange_rate_cache)
def get_exchange_rates(base_currency="USD"):
    """Fetch exchange rates from an API with caching"""
    try:
        url = f"https://api.exchangerate-api.com/v4/latest/{base_currency}"
        response = requests.get(url, timeout=5)
        data = response.json()
        return data.get('rates', {"USD": 1.0, "DKK": 6.8991310126})
    except Exception as e:
        print(f"Error fetching exchange rates: {e}")
        # Fallback rates
        return {"USD": 1.0, "DKK": 6.8991310126}


def convert_currency(amount: float, from_currency: str = "USD", to_currency: str = "USD") -> float:
    """Convert amount between currencies"""
    try:
        # If currencies are the same, just return the original amount
        if from_currency == to_currency:
            return amount

        # Get exchange rates (cached)
        rates = get_exchange_rates(base_currency="USD")
        
        # Log the rates and currencies for debugging
        calc_logger.debug(f"Converting {amount} from {from_currency} to {to_currency}")
        calc_logger.debug(f"Available rates: {sorted(rates.keys())}")
        
        # Convert to USD as an intermediate step if needed
        if from_currency != "USD":
            if from_currency not in rates:
                calc_logger.warning(f"No rate found for {from_currency}, using 1.0")
                from_rate = 1.0
            else:
                from_rate = rates.get(from_currency)
            
            amount = amount / from_rate
            calc_logger.debug(f"Converted to USD: {amount}")

        # Convert from USD to target currency
        if to_currency != "USD":
            if to_currency not in rates:
                calc_logger.warning(f"No rate found for {to_currency}, using 1.0")
                to_rate = 1.0
            else:
                to_rate = rates.get(to_currency)
                
            amount = amount * to_rate
            calc_logger.debug(f"Converted from USD to {to_currency}: {amount}")
            
        return amount
    except Exception as e:
        calc_logger.error(f"Error in currency conversion: {str(e)}")
        # In case of error, return the original amount
        return amount



@cached(cache=strategy_cache, key=lambda loans, monthly_surplus, **kwargs: f"{hash(str(loans))}-{monthly_surplus}")
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

    # Initialize strategies
    strategies = {
        "debt_avalanche": {"name": "Debt Avalanche", "details": {}},
        "debt_snowball": {"name": "Debt Snowball", "details": {}},
        "highest_interest_first": {"name": "Highest Interest First", "details": {}},
        "balanced": {"name": "Balanced Approach", "details": {}},
        "invest_first": {"name": "Invest First", "details": {}}
    }

    # Calculate loan comparisons for each loan
    loan_comparisons = []

    for loan in loans:
        # Extract loan details
        loan_id = loan.get('id')
        loan_name = loan.get('name', f'Loan {loan_id}')
        principal = loan.get('balance', 0)
        interest_rate = loan.get('interest_rate', 0) / 100  # Convert percentage to decimal
        term_years = loan.get('term_years', 0)
        minimum_payment = loan.get('minimum_payment', 0)

        # Skip invalid loans
        if principal <= 0 or interest_rate <= 0 or minimum_payment <= 0:
            continue

        # Baseline (minimum payments)
        baseline = generate_amortization_schedule(
            principal=principal,
            annual_rate=interest_rate,
            monthly_payment=minimum_payment
        )

        # Accelerated (with extra payments)
        accelerated = generate_amortization_schedule(
            principal=principal,
            annual_rate=interest_rate,
            monthly_payment=minimum_payment,
            extra_payment=monthly_surplus
        )

        # Interest saved
        interest_saved = baseline["total_interest_paid"] - accelerated["total_interest_paid"]

        # Time saved
        months_saved = baseline["months_to_payoff"] - accelerated["months_to_payoff"]

        # Investment growth if investing the surplus
        investment_projection = calculate_investment_projection(
            monthly_amount=monthly_surplus,
            annual_return=annual_investment_return,
            months=accelerated["months_to_payoff"],
            inflation_rate=inflation_rate,
            risk_factor=risk_factor
        )

        # Determine if paying down is better than investing
        risk_adjusted_investment = investment_projection["risk_adjusted_balance"]
        paying_down_better = interest_saved > risk_adjusted_investment

        # Calculate advantage amount
        advantage_amount = abs(interest_saved - risk_adjusted_investment)

        # Add to loan comparisons
        loan_comparisons.append({
            "loan_id": loan_id,
            "loan_name": loan_name,
            "interest_rate": interest_rate * 100,  # Convert back to percentage
            "principal": principal,
            "minimum_payment": minimum_payment,
            "baseline": {
                "months_to_payoff": baseline["months_to_payoff"],
                "total_interest": baseline["total_interest_paid"]
            },
            "accelerated": {
                "months_to_payoff": accelerated["months_to_payoff"],
                "total_interest": accelerated["total_interest_paid"]
            },
            "interest_saved": interest_saved,
            "months_saved": months_saved,
            "investment_growth": investment_projection["final_balance"],
            "risk_adjusted_investment": risk_adjusted_investment,
            "paying_down_better": paying_down_better,
            "advantage_amount": advantage_amount
        })

    # Sort loans by interest rate (highest first) for debt avalanche strategy
    sorted_by_rate = sorted(loans, key=lambda x: x.get('interest_rate', 0), reverse=True)

    # Sort loans by balance (lowest first) for debt snowball strategy
    sorted_by_balance = sorted(loans, key=lambda x: x.get('balance', 0))

    # Calculate debt avalanche strategy
    strategies["debt_avalanche"]["details"] = simulate_debt_payoff_strategy(
        loans=sorted_by_rate,
        monthly_surplus=monthly_surplus,
        annual_investment_return=annual_investment_return,
        strategy="avalanche"
    )

    # Calculate debt snowball strategy
    strategies["debt_snowball"]["details"] = simulate_debt_payoff_strategy(
        loans=sorted_by_balance,
        monthly_surplus=monthly_surplus,
        annual_investment_return=annual_investment_return,
        strategy="snowball"
    )

    # Calculate highest interest first (focus only on highest interest loan)
    if sorted_by_rate:
        strategies["highest_interest_first"]["details"] = simulate_debt_payoff_strategy(
            loans=sorted_by_rate,
            monthly_surplus=monthly_surplus,
            annual_investment_return=annual_investment_return,
            strategy="highest_interest_only"
        )

    # Calculate balanced approach (pay down high interest loans, invest for low interest)
    # High interest = above risk-adjusted investment return
    risk_adjusted_return = annual_investment_return * (1 - risk_factor)
    high_interest_loans = [loan for loan in loans if loan.get('interest_rate', 0) / 100 > risk_adjusted_return]
    low_interest_loans = [loan for loan in loans if loan.get('interest_rate', 0) / 100 <= risk_adjusted_return]

    strategies["balanced"]["details"] = simulate_balanced_strategy(
        high_interest_loans=high_interest_loans,
        low_interest_loans=low_interest_loans,
        monthly_surplus=monthly_surplus,
        annual_investment_return=annual_investment_return,
        risk_adjusted_return=risk_adjusted_return
    )

    # Calculate invest first strategy
    strategies["invest_first"]["details"] = simulate_invest_first_strategy(
        loans=loans,
        monthly_surplus=monthly_surplus,
        annual_investment_return=annual_investment_return
    )

    # Determine best strategy
    best_strategy = max(strategies.items(), key=lambda s: s[1]["details"].get("final_net_worth", 0))
    best_strategy_key = best_strategy[0]
    best_strategy_details = best_strategy[1]

    # Generate recommendation
    recommendation = {
        "best_strategy": best_strategy_details["name"],
        "strategy_key": best_strategy_key,
        "net_worth_advantage": {},
        "details": best_strategy_details["details"],
        "risk_adjusted_return": risk_adjusted_return * 100  # Convert to percentage
    }

    # Calculate advantage over other strategies
    for key, strategy in strategies.items():
        if key != best_strategy_key and "details" in strategy and "final_net_worth" in strategy["details"]:
            advantage = best_strategy_details["details"]["final_net_worth"] - strategy["details"]["final_net_worth"]
            advantage_percent = (advantage / strategy["details"]["final_net_worth"]) * 100 if strategy["details"]["final_net_worth"] > 0 else 0
            recommendation["net_worth_advantage"][key] = {
                "amount": advantage,
                "percent": advantage_percent
            }

    return {
        "recommendation": recommendation,
        "strategies": strategies,
        "loan_comparisons": loan_comparisons,
        "risk_adjusted_return": risk_adjusted_return
    }

def simulate_debt_payoff_strategy(
        loans: List[Dict[str, Any]],
        monthly_surplus: float,
        annual_investment_return: float,
        strategy: str = "avalanche"
) -> Dict[str, Any]:
    """
    Simulate debt payoff using a specific strategy (avalanche, snowball, etc.).

    Args:
        loans: List of loans (sorted according to strategy)
        monthly_surplus: Extra money available monthly after minimum payments
        annual_investment_return: Expected annual return on investments
        strategy: Strategy to simulate (avalanche, snowball, highest_interest_only)

    Returns:
        Dictionary with strategy results
    """
    if not loans or monthly_surplus <= 0:
        return {
            "final_net_worth": 0,
            "total_interest_paid": 0,
            "months_to_debt_free": 0,
            "investment_value": 0
        }

    # Create copies of loans to avoid modifying originals
    working_loans = []
    for loan in loans:
        working_loans.append({
            "id": loan.get('id'),
            "name": loan.get('name', f'Loan {loan.get("id", 0)}'),
            "balance": loan.get('balance', 0),
            "interest_rate": loan.get('interest_rate', 0) / 100,  # Convert to decimal
            "minimum_payment": loan.get('minimum_payment', 0)
        })

    # Initialize tracking variables
    month = 0
    total_interest_paid = 0
    investment_balance = 0
    monthly_return = annual_investment_return / 12
    max_months = 30 * 12  # Simulate up to 30 years
    monthly_data = []

    # Continue until all loans are paid off or reached max simulation time
    while any(loan["balance"] > 0 for loan in working_loans) and month < max_months:
        month += 1

        # Calculate total minimum payments
        total_minimum_payment = sum(
            min(loan["minimum_payment"], loan["balance"])
            for loan in working_loans if loan["balance"] > 0
        )

        # Available surplus after minimum payments
        available_surplus = monthly_surplus

        # Make minimum payments on all loans
        for loan in working_loans:
            if loan["balance"] <= 0:
                continue

            # Calculate interest
            interest = loan["balance"] * (loan["interest_rate"] / 12)
            total_interest_paid += interest

            # Apply minimum payment
            payment = min(loan["minimum_payment"], loan["balance"] + interest)
            principal_payment = payment - interest
            loan["balance"] -= principal_payment

            # Ensure balance doesn't go negative
            if loan["balance"] < 0.01:
                loan["balance"] = 0

        # Apply extra payment according to strategy
        if strategy == "avalanche" or strategy == "snowball":
            # Find first loan with positive balance
            target_loan = next((loan for loan in working_loans if loan["balance"] > 0), None)

            if target_loan:
                # Apply extra payment
                extra_payment = min(available_surplus, target_loan["balance"])
                target_loan["balance"] -= extra_payment
                available_surplus -= extra_payment

                # Ensure balance doesn't go negative
                if target_loan["balance"] < 0.01:
                    target_loan["balance"] = 0

        elif strategy == "highest_interest_only":
            # Only apply extra to the first loan (which should be highest interest)
            target_loan = working_loans[0] if working_loans else None

            if target_loan and target_loan["balance"] > 0:
                # Apply extra payment
                extra_payment = min(available_surplus, target_loan["balance"])
                target_loan["balance"] -= extra_payment
                available_surplus -= extra_payment

                # Ensure balance doesn't go negative
                if target_loan["balance"] < 0.01:
                    target_loan["balance"] = 0

        # Invest any remaining surplus
        if available_surplus > 0:
            investment_balance += available_surplus

        # Grow investments
        investment_balance *= (1 + monthly_return)

        # Record data for this month
        total_debt = sum(loan["balance"] for loan in working_loans)
        monthly_data.append({
            "month": month,
            "total_debt": total_debt,
            "investment_balance": investment_balance,
            "net_worth": investment_balance - total_debt,
            "total_interest_paid": total_interest_paid
        })

    # Once all loans are paid off, invest all monthly payment + surplus
    total_monthly_payment = sum(loan["minimum_payment"] for loan in loans) + monthly_surplus

    # Continue simulation until max months
    while month < max_months:
        month += 1

        # Add monthly payment to investment
        investment_balance += total_monthly_payment

        # Grow investments
        investment_balance *= (1 + monthly_return)

        # Record data
        monthly_data.append({
            "month": month,
            "total_debt": 0,
            "investment_balance": investment_balance,
            "net_worth": investment_balance,
            "total_interest_paid": total_interest_paid
        })

    # Calculate months to debt free
    debt_free_month = next((data["month"] for data in monthly_data if data["total_debt"] == 0), max_months)

    # Create yearly data for charts
    yearly_data = []
    for year in range(1, (max_months // 12) + 1):
        month_idx = year * 12 - 1
        if month_idx < len(monthly_data):
            yearly_data.append({
                "year": year,
                "netWorth": monthly_data[month_idx]["net_worth"],
                "investmentValue": monthly_data[month_idx]["investment_balance"],
                "debtValue": monthly_data[month_idx]["total_debt"]
            })

    return {
        "final_net_worth": monthly_data[-1]["net_worth"] if monthly_data else 0,
        "total_interest_paid": total_interest_paid,
        "months_to_debt_free": debt_free_month,
        "investment_value": monthly_data[-1]["investment_balance"] if monthly_data else 0,
        "monthly_data": monthly_data,
        "yearly_data": yearly_data
    }

def simulate_balanced_strategy(
        high_interest_loans: List[Dict[str, Any]],
        low_interest_loans: List[Dict[str, Any]],
        monthly_surplus: float,
        annual_investment_return: float,
        risk_adjusted_return: float
) -> Dict[str, Any]:
    """
    Simulate balanced strategy: pay down high interest loans, invest for low interest.

    Args:
        high_interest_loans: Loans with rates above risk-adjusted return
        low_interest_loans: Loans with rates below risk-adjusted return
        monthly_surplus: Extra money available monthly
        annual_investment_return: Expected annual return on investments
        risk_adjusted_return: Risk-adjusted investment return

    Returns:
        Dictionary with strategy results
    """
    # Sort high interest loans by interest rate (highest first)
    high_interest_loans = sorted(high_interest_loans, key=lambda x: x.get('interest_rate', 0), reverse=True)

    # Create copies of all loans
    all_loans = []
    for loan in high_interest_loans + low_interest_loans:
        all_loans.append({
            "id": loan.get('id'),
            "name": loan.get('name', f'Loan {loan.get("id", 0)}'),
            "balance": loan.get('balance', 0),
            "interest_rate": loan.get('interest_rate', 0) / 100,  # Convert to decimal
            "minimum_payment": loan.get('minimum_payment', 0),
            "is_high_interest": loan in high_interest_loans
        })

    # Initialize tracking variables
    month = 0
    total_interest_paid = 0
    investment_balance = 0
    monthly_return = annual_investment_return / 12
    max_months = 30 * 12  # Simulate up to 30 years
    monthly_data = []

    # Continue until all loans are paid off or reached max simulation time
    while any(loan["balance"] > 0 for loan in all_loans) and month < max_months:
        month += 1

        # Calculate total minimum payments
        total_minimum_payment = sum(
            min(loan["minimum_payment"], loan["balance"])
            for loan in all_loans if loan["balance"] > 0
        )

        # Available surplus after minimum payments
        available_surplus = monthly_surplus

        # Make minimum payments on all loans
        for loan in all_loans:
            if loan["balance"] <= 0:
                continue

            # Calculate interest
            interest = loan["balance"] * (loan["interest_rate"] / 12)
            total_interest_paid += interest

            # Apply minimum payment
            payment = min(loan["minimum_payment"], loan["balance"] + interest)
            principal_payment = payment - interest
            loan["balance"] -= principal_payment

            # Ensure balance doesn't go negative
            if loan["balance"] < 0.01:
                loan["balance"] = 0

        # First apply extra payment to high interest loans
        for loan in [l for l in all_loans if l["is_high_interest"] and l["balance"] > 0]:
            if available_surplus <= 0:
                break

            # Apply extra payment
            extra_payment = min(available_surplus, loan["balance"])
            loan["balance"] -= extra_payment
            available_surplus -= extra_payment

            # Ensure balance doesn't go negative
            if loan["balance"] < 0.01:
                loan["balance"] = 0

        # Invest any remaining surplus
        if available_surplus > 0:
            investment_balance += available_surplus

        # Grow investments
        investment_balance *= (1 + monthly_return)

        # Record data for this month
        total_debt = sum(loan["balance"] for loan in all_loans)
        monthly_data.append({
            "month": month,
            "total_debt": total_debt,
            "investment_balance": investment_balance,
            "net_worth": investment_balance - total_debt,
            "total_interest_paid": total_interest_paid
        })

    # Once all loans are paid off, invest all monthly payment + surplus
    total_monthly_payment = sum(loan["minimum_payment"] for loan in high_interest_loans + low_interest_loans) + monthly_surplus

    # Continue simulation until max months
    while month < max_months:
        month += 1

        # Add monthly payment to investment
        investment_balance += total_monthly_payment

        # Grow investments
        investment_balance *= (1 + monthly_return)

        # Record data
        monthly_data.append({
            "month": month,
            "total_debt": 0,
            "investment_balance": investment_balance,
            "net_worth": investment_balance,
            "total_interest_paid": total_interest_paid
        })

    # Calculate months to debt free
    debt_free_month = next((data["month"] for data in monthly_data if data["total_debt"] == 0), max_months)

    # Create yearly data for charts
    yearly_data = []
    for year in range(1, (max_months // 12) + 1):
        month_idx = year * 12 - 1
        if month_idx < len(monthly_data):
            yearly_data.append({
                "year": year,
                "netWorth": monthly_data[month_idx]["net_worth"],
                "investmentValue": monthly_data[month_idx]["investment_balance"],
                "debtValue": monthly_data[month_idx]["total_debt"]
            })

    return {
        "final_net_worth": monthly_data[-1]["net_worth"] if monthly_data else 0,
        "total_interest_paid": total_interest_paid,
        "months_to_debt_free": debt_free_month,
        "investment_value": monthly_data[-1]["investment_balance"] if monthly_data else 0,
        "monthly_data": monthly_data,
        "yearly_data": yearly_data
    }

def simulate_invest_first_strategy(
        loans: List[Dict[str, Any]],
        monthly_surplus: float,
        annual_investment_return: float
) -> Dict[str, Any]:
    """
    Simulate strategy: invest all surplus, pay only minimum on loans.

    Args:
        loans: List of loans
        monthly_surplus: Extra money available monthly
        annual_investment_return: Expected annual return on investments

    Returns:
        Dictionary with strategy results
    """
    # Create copies of loans
    working_loans = []
    for loan in loans:
        working_loans.append({
            "id": loan.get('id'),
            "name": loan.get('name', f'Loan {loan.get("id", 0)}'),
            "balance": loan.get('balance', 0),
            "interest_rate": loan.get('interest_rate', 0) / 100,  # Convert to decimal
            "minimum_payment": loan.get('minimum_payment', 0)
        })

    # Initialize tracking variables
    month = 0
    total_interest_paid = 0
    investment_balance = 0
    monthly_return = annual_investment_return / 12
    max_months = 30 * 12  # Simulate up to 30 years
    monthly_data = []

    # Continue until all loans are paid off or reached max simulation time
    while any(loan["balance"] > 0 for loan in working_loans) and month < max_months:
        month += 1

        # Make minimum payments on all loans
        for loan in working_loans:
            if loan["balance"] <= 0:
                continue

            # Calculate interest
            interest = loan["balance"] * (loan["interest_rate"] / 12)
            total_interest_paid += interest

            # Apply minimum payment
            payment = min(loan["minimum_payment"], loan["balance"] + interest)
            principal_payment = payment - interest
            loan["balance"] -= principal_payment

            # Ensure balance doesn't go negative
            if loan["balance"] < 0.01:
                loan["balance"] = 0

        # Invest all surplus
        investment_balance += monthly_surplus

        # Grow investments
        investment_balance *= (1 + monthly_return)

        # Record data for this month
        total_debt = sum(loan["balance"] for loan in working_loans)
        monthly_data.append({
            "month": month,
            "total_debt": total_debt,
            "investment_balance": investment_balance,
            "net_worth": investment_balance - total_debt,
            "total_interest_paid": total_interest_paid
        })

    # Once all loans are paid off, invest all monthly payment + surplus
    total_monthly_payment = sum(loan["minimum_payment"] for loan in loans) + monthly_surplus

    # Continue simulation until max months
    while month < max_months:
        month += 1

        # Add monthly payment to investment
        investment_balance += total_monthly_payment

        # Grow investments
        investment_balance *= (1 + monthly_return)

        # Record data
        monthly_data.append({
            "month": month,
            "total_debt": 0,
            "investment_balance": investment_balance,
            "net_worth": investment_balance,
            "total_interest_paid": total_interest_paid
        })

    # Calculate months to debt free
    debt_free_month = next((data["month"] for data in monthly_data if data["total_debt"] == 0), max_months)

    # Create yearly data for charts
    yearly_data = []
    for year in range(1, (max_months // 12) + 1):
        month_idx = year * 12 - 1
        if month_idx < len(monthly_data):
            yearly_data.append({
                "year": year,
                "netWorth": monthly_data[month_idx]["net_worth"],
                "investmentValue": monthly_data[month_idx]["investment_balance"],
                "debtValue": monthly_data[month_idx]["total_debt"]
            })

    return {
        "final_net_worth": monthly_data[-1]["net_worth"] if monthly_data else 0,
        "total_interest_paid": total_interest_paid,
        "months_to_debt_free": debt_free_month,
        "investment_value": monthly_data[-1]["investment_balance"] if monthly_data else 0,
        "monthly_data": monthly_data,
        "yearly_data": yearly_data
    }

@cached(cache=exchange_rate_cache)
def get_exchange_rates(base_currency="USD"):
    """Fetch exchange rates from an API with caching"""
    try:
        url = f"https://api.exchangerate-api.com/v4/latest/{base_currency}"
        response = requests.get(url, timeout=5)
        data = response.json()
        return data.get('rates', {"USD": 1.0, "DKK": 6.8991310126})
    except Exception as e:
        calc_logger.error(f"Error fetching exchange rates: {e}")
        # Fallback rates
        return {"USD": 1.0, "DKK": 6.8991310126}
