# backend/app/api/financial_strategy.py - Enhanced strategy calculations

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any, Optional
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, check_supabase_error, standardize_response
from ..calculations import (
    convert_currency,
    calculate_financial_strategy_comparison,
    simulate_debt_payoff_strategy,
    simulate_balanced_strategy,
    simulate_invest_first_strategy
)
from ..database import get_supabase_client
import logging

# Set up logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["financial_strategy"])

@router.post("/user/{user_id}/financial-strategy")
@handle_exceptions
async def get_financial_strategy(
        user_id: str,
        request: Dict[str, Any] = Body(...),  # Use Body for request data
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Compare financial strategies and provide recommendations
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        # Extract data from the request dictionary
        loans_data = request.get("loans", [])
        monthly_surplus = request.get("monthly_surplus", 0)
        annual_investment_return = request.get("annual_investment_return", 0.07)
        inflation_rate = request.get("inflation_rate", 0.025)
        risk_factor = request.get("risk_factor", 0.2)
        currency = request.get("currency", "USD")
        include_risk_analysis = request.get("include_risk_analysis", False)

        # Validate request data
        if not loans_data or len(loans_data) == 0:
            raise HTTPException(status_code=422, detail="No loans provided in request")

        if monthly_surplus <= 0:
            raise HTTPException(status_code=422, detail="Monthly surplus must be greater than 0")

        # Convert loans to dictionary format and convert currency to USD
        loans_dict = []
        for loan in loans_data:
            loans_dict.append({
                "id": loan.get("loan_id"),
                "name": loan.get("name", ""),
                "balance": convert_currency(loan.get("balance", 0), currency, "USD"),
                "interest_rate": loan.get("interest_rate", 0),
                "term_years": loan.get("term_years", 0),
                "minimum_payment": convert_currency(loan.get("minimum_payment", 0), currency, "USD"),
                "loan_type": loan.get("loan_type", "OTHER")
            })

        # Convert monthly surplus to USD for calculations
        monthly_surplus_usd = convert_currency(monthly_surplus, currency, "USD")

        # Calculate comprehensive strategy analysis
        strategy_results = calculate_financial_strategy_comparison(
            loans=loans_dict,
            monthly_surplus=monthly_surplus_usd,
            annual_investment_return=annual_investment_return,
            inflation_rate=inflation_rate,
            risk_factor=risk_factor
        )

        # If risk analysis is requested, calculate additional risk scenarios
        risk_analysis = {}
        if include_risk_analysis:
            # Calculate pessimistic scenario (higher risk factor)
            pessimistic_risk_factor = min(0.9, risk_factor * 1.5)  # 50% more conservative
            pessimistic_results = calculate_financial_strategy_comparison(
                loans=loans_dict,
                monthly_surplus=monthly_surplus_usd,
                annual_investment_return=annual_investment_return,
                inflation_rate=inflation_rate,
                risk_factor=pessimistic_risk_factor
            )

            # Calculate optimistic scenario (lower risk factor)
            optimistic_risk_factor = max(0.1, risk_factor * 0.5)  # 50% more optimistic
            optimistic_results = calculate_financial_strategy_comparison(
                loans=loans_dict,
                monthly_surplus=monthly_surplus_usd,
                annual_investment_return=annual_investment_return,
                inflation_rate=inflation_rate,
                risk_factor=optimistic_risk_factor
            )

            # Extract recommended strategy from each scenario
            best_strategy = strategy_results["recommendation"]["strategy_key"]
            pessimistic_strategy = pessimistic_results["recommendation"]["strategy_key"]
            optimistic_strategy = optimistic_results["recommendation"]["strategy_key"]

            # Create risk analysis data
            risk_analysis = {
                "scenarios": {
                    "standard": {
                        "risk_factor": risk_factor,
                        "best_strategy": strategy_results["recommendation"]["best_strategy"],
                        "strategy_key": best_strategy,
                        "final_net_worth": strategy_results["strategies"][best_strategy]["details"]["final_net_worth"],
                        "total_interest_paid": strategy_results["strategies"][best_strategy]["details"]["total_interest_paid"],
                        "months_to_debt_free": strategy_results["strategies"][best_strategy]["details"]["months_to_debt_free"],
                        "investment_value": strategy_results["strategies"][best_strategy]["details"]["investment_value"],
                        "yearly_data": strategy_results["strategies"][best_strategy]["details"]["yearly_data"]
                    },
                    "pessimistic": {
                        "risk_factor": pessimistic_risk_factor,
                        "best_strategy": pessimistic_results["recommendation"]["best_strategy"],
                        "strategy_key": pessimistic_strategy,
                        "final_net_worth": pessimistic_results["strategies"][pessimistic_strategy]["details"]["final_net_worth"],
                        "total_interest_paid": pessimistic_results["strategies"][pessimistic_strategy]["details"]["total_interest_paid"],
                        "months_to_debt_free": pessimistic_results["strategies"][pessimistic_strategy]["details"]["months_to_debt_free"],
                        "investment_value": pessimistic_results["strategies"][pessimistic_strategy]["details"]["investment_value"],
                        "yearly_data": pessimistic_results["strategies"][pessimistic_strategy]["details"]["yearly_data"]
                    },
                    "optimistic": {
                        "risk_factor": optimistic_risk_factor,
                        "best_strategy": optimistic_results["recommendation"]["best_strategy"],
                        "strategy_key": optimistic_strategy,
                        "final_net_worth": optimistic_results["strategies"][optimistic_strategy]["details"]["final_net_worth"],
                        "total_interest_paid": optimistic_results["strategies"][optimistic_strategy]["details"]["total_interest_paid"],
                        "months_to_debt_free": optimistic_results["strategies"][optimistic_strategy]["details"]["months_to_debt_free"],
                        "investment_value": optimistic_results["strategies"][optimistic_strategy]["details"]["investment_value"],
                        "yearly_data": optimistic_results["strategies"][optimistic_strategy]["details"]["yearly_data"]
                    }
                },
                "strategy_consistency": {
                    "same_across_all": best_strategy == pessimistic_strategy == optimistic_strategy,
                    "standard_matches_pessimistic": best_strategy == pessimistic_strategy,
                    "standard_matches_optimistic": best_strategy == optimistic_strategy
                },
                "risk_sensitivity": {
                    "high": abs(strategy_results["strategies"][best_strategy]["details"]["final_net_worth"] -
                                pessimistic_results["strategies"][pessimistic_strategy]["details"]["final_net_worth"]) /
                            strategy_results["strategies"][best_strategy]["details"]["final_net_worth"] if
                    strategy_results["strategies"][best_strategy]["details"]["final_net_worth"] > 0 else 0,
                    "low": abs(optimistic_results["strategies"][optimistic_strategy]["details"]["final_net_worth"] -
                               strategy_results["strategies"][best_strategy]["details"]["final_net_worth"]) /
                           strategy_results["strategies"][best_strategy]["details"]["final_net_worth"] if
                    strategy_results["strategies"][best_strategy]["details"]["final_net_worth"] > 0 else 0
                }
            }

        # Convert monetary values back to requested currency
        # This is a simplified example - in a complete implementation you'd convert all monetary values
        for strategy_key, strategy in strategy_results["strategies"].items():
            if "details" in strategy and "final_net_worth" in strategy["details"]:
                strategy["details"]["final_net_worth"] = convert_currency(
                    strategy["details"]["final_net_worth"], "USD", currency
                )
                strategy["details"]["total_interest_paid"] = convert_currency(
                    strategy["details"]["total_interest_paid"], "USD", currency
                )
                strategy["details"]["investment_value"] = convert_currency(
                    strategy["details"]["investment_value"], "USD", currency
                )

                # Convert yearly data values
                if "yearly_data" in strategy["details"]:
                    for data_point in strategy["details"]["yearly_data"]:
                        data_point["netWorth"] = convert_currency(data_point["netWorth"], "USD", currency)
                        data_point["investmentValue"] = convert_currency(data_point["investmentValue"], "USD", currency)
                        data_point["debtValue"] = convert_currency(data_point["debtValue"], "USD", currency)

        for loan_comparison in strategy_results["loan_comparisons"]:
            loan_comparison["principal"] = convert_currency(loan_comparison["principal"], "USD", currency)
            loan_comparison["minimum_payment"] = convert_currency(loan_comparison["minimum_payment"], "USD", currency)
            loan_comparison["interest_saved"] = convert_currency(loan_comparison["interest_saved"], "USD", currency)
            loan_comparison["investment_growth"] = convert_currency(loan_comparison["investment_growth"], "USD", currency)
            loan_comparison["risk_adjusted_investment"] = convert_currency(loan_comparison["risk_adjusted_investment"], "USD", currency)
            loan_comparison["advantage_amount"] = convert_currency(loan_comparison["advantage_amount"], "USD", currency)
            loan_comparison["baseline"]["total_interest"] = convert_currency(loan_comparison["baseline"]["total_interest"], "USD", currency)
            loan_comparison["accelerated"]["total_interest"] = convert_currency(loan_comparison["accelerated"]["total_interest"], "USD", currency)

        # Create combined results
        result = {
            "recommendation": strategy_results["recommendation"],
            "strategies": strategy_results["strategies"],
            "loan_comparisons": strategy_results["loan_comparisons"],
            "risk_adjusted_return": strategy_results["risk_adjusted_return"] * 100  # Convert to percentage
        }

        # Add risk analysis if included
        if include_risk_analysis:
            result["risk_analysis"] = risk_analysis

        return standardize_response(data=result)

    except HTTPException:
        # Re-raise HTTP exceptions to preserve status codes
        raise
    except Exception as e:
        logger.exception("Error calculating financial strategy")
        return standardize_response(
            error=f"Error calculating financial strategy: {str(e)}"
        )

@router.post("/financial-strategy/optimize")
@handle_exceptions
async def optimize_financial_strategy(
        request: Dict[str, Any] = Body(...),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate optimal financial strategy based on provided loans and budget
    """
    try:
        # Extract request data
        loans = request.get("loans", [])
        monthly_budget = request.get("monthly_budget", 0)
        risk_factor = request.get("risk_factor", 0.2)
        annual_investment_return = request.get("annual_investment_return", 0.07)
        currency = request.get("currency", "USD")

        # Validate input
        if not loans:
            return standardize_response(error="No loans provided")

        if monthly_budget <= 0:
            return standardize_response(error="Monthly budget must be greater than zero")

        # Format loans for calculations
        formatted_loans = []
        for loan in loans:
            formatted_loans.append({
                "id": loan.get("id"),
                "name": loan.get("name", f"Loan {loan.get('id')}"),
                "balance": convert_currency(loan.get("balance", 0), currency, "USD"),
                "interest_rate": loan.get("interestRate", 0),
                "term_years": loan.get("termYears", 0),
                "minimum_payment": convert_currency(loan.get("minimumPayment", 0), currency, "USD"),
                "loan_type": loan.get("loanType", "OTHER")
            })

        # Convert monthly budget to USD
        monthly_budget_usd = convert_currency(monthly_budget, currency, "USD")

        # Calculate minimum payments total
        total_minimum_payment = sum(loan["minimum_payment"] for loan in formatted_loans)

        # Calculate available surplus
        monthly_surplus = max(0, monthly_budget_usd - total_minimum_payment)

        # If no surplus, return early with basic result
        if monthly_surplus <= 0:
            return standardize_response(
                data={
                    "optimal_strategy": "minimum-payments-only",
                    "message": "No surplus available after minimum payments",
                    "total_minimum_payment": convert_currency(total_minimum_payment, "USD", currency),
                    "loan_comparisons": []
                }
            )

        # Get strategy comparison
        strategies = calculate_financial_strategy_comparison(
            loans=formatted_loans,
            monthly_surplus=monthly_surplus,
            annual_investment_return=annual_investment_return,
            risk_factor=risk_factor
        )

        # Convert monetary values back to requested currency
        best_strategy_key = strategies["recommendation"]["strategy_key"]

        # Convert result values to requested currency
        result = {
            "optimal_strategy": strategies["recommendation"]["best_strategy"],
            "strategy_key": best_strategy_key,
            "risk_adjusted_return": strategies["risk_adjusted_return"] * 100,
            "total_minimum_payment": convert_currency(total_minimum_payment, "USD", currency),
            "monthly_surplus": convert_currency(monthly_surplus, "USD", currency),
            "loan_comparisons": []
        }

        # Convert loan comparisons
        for loan_comparison in strategies["loan_comparisons"]:
            result["loan_comparisons"].append({
                "loanId": loan_comparison["loan_id"],
                "loanName": loan_comparison["loan_name"],
                "interestRate": loan_comparison["interest_rate"],
                "balance": convert_currency(loan_comparison["principal"], "USD", currency),
                "minimumPayment": convert_currency(loan_comparison["minimum_payment"], "USD", currency),
                "interestSaved": convert_currency(loan_comparison["interest_saved"], "USD", currency),
                "monthsSaved": loan_comparison["months_saved"],
                "investmentGrowth": convert_currency(loan_comparison["investment_growth"], "USD", currency),
                "riskAdjustedGrowth": convert_currency(loan_comparison["risk_adjusted_investment"], "USD", currency),
                "payingDownBetter": loan_comparison["paying_down_better"],
                "advantageAmount": convert_currency(loan_comparison["advantage_amount"], "USD", currency)
            })

        # Prepare strategy details
        strategy_details = {}
        for name, strategy in strategies["strategies"].items():
            if "details" in strategy:
                details = strategy["details"]
                yearly_data = []

                # Convert yearly data
                if "yearly_data" in details:
                    for data in details["yearly_data"]:
                        yearly_data.append({
                            "year": data["year"],
                            "netWorth": convert_currency(data["netWorth"], "USD", currency),
                            "investmentValue": convert_currency(data["investmentValue"], "USD", currency),
                            "debtValue": convert_currency(data["debtValue"], "USD", currency)
                        })

                strategy_details[name] = {
                    "name": strategy["name"],
                    "finalNetWorth": convert_currency(details.get("final_net_worth", 0), "USD", currency),
                    "totalInterestPaid": convert_currency(details.get("total_interest_paid", 0), "USD", currency),
                    "monthsToDebtFree": details.get("months_to_debt_free", 0),
                    "investmentValue": convert_currency(details.get("investment_value", 0), "USD", currency),
                    "yearlyData": yearly_data
                }

        result["strategies"] = strategy_details

        return standardize_response(data=result)
    except Exception as e:
        logger.exception("Error optimizing financial strategy")
        return standardize_response(
            error=f"Error optimizing financial strategy: {str(e)}"
        )