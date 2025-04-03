# backend/app/api/investments.py

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from enum import Enum
from ..models import InvestmentEntry, InvestmentRequest, InvestmentResponse
from ..calculations import calculate_investment_projection, convert_currency
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, check_supabase_error, standardize_response
from ..database import get_supabase_client

router = APIRouter(prefix="/api", tags=["investments"])

class InvestmentType(str, Enum):
    STOCK = "STOCK"
    BOND = "BOND"
    ETF = "ETF"
    CRYPTO = "CRYPTO"
    REAL_ESTATE = "REAL_ESTATE"
    OTHER = "OTHER"

class InvestmentPortfolio(BaseModel):
    user_id: str
    name: str
    description: Optional[str] = None
    goal_amount: Optional[float] = None
    target_date: Optional[datetime] = None

class Investment(BaseModel):
    id: Optional[int] = None
    portfolio_id: int
    user_id: str
    name: str
    symbol: Optional[str] = None
    type: InvestmentType = InvestmentType.OTHER
    purchase_date: datetime
    amount: float
    purchase_price: float
    current_price: Optional[float] = None
    last_updated: Optional[datetime] = None
    notes: Optional[str] = None

# Calculate projection endpoint (previously implemented)
@router.post("/investment/projection", response_model=InvestmentResponse)
@handle_exceptions
async def get_investment_projection(
        request: InvestmentRequest,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate investment projection with inflation and risk adjustments
    """
    try:
        # Convert values from user currency to USD if needed
        monthly_amount_usd = convert_currency(request.monthly_amount, request.currency, "USD")

        # Calculate projection in USD
        projection_data = calculate_investment_projection(
            monthly_amount=monthly_amount_usd,
            annual_return=request.annual_return,
            months=request.months,
            inflation_rate=request.inflation_rate,
            risk_factor=request.risk_factor
        )

        # Convert results back to user's currency
        projection = []
        for entry in projection_data["projection"]:
            projection.append({
                "month": entry["month"],
                "date": entry["date"],
                "balance": convert_currency(entry["balance"], "USD", request.currency),
                "inflation_adjusted_balance": convert_currency(entry["inflation_adjusted_balance"], "USD", request.currency),
                "risk_adjusted_balance": convert_currency(entry["risk_adjusted_balance"], "USD", request.currency)
            })

        final_balance = convert_currency(projection_data["final_balance"], "USD", request.currency)
        inflation_adjusted_final_balance = convert_currency(projection_data["inflation_adjusted_final_balance"], "USD", request.currency)
        risk_adjusted_balance = convert_currency(projection_data["risk_adjusted_balance"], "USD", request.currency)

        return InvestmentResponse(
            projection=projection,
            final_balance=final_balance,
            inflation_adjusted_final_balance=inflation_adjusted_final_balance,
            risk_adjusted_balance=risk_adjusted_balance
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating investment projection: {str(e)}")

# New endpoints for investment tracking feature

@router.get("/user/{user_id}/portfolios")
@handle_exceptions
async def get_user_portfolios(
        user_id: str,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Get all investment portfolios for a user
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Query portfolios
    portfolios_response = supabase.table("investment_portfolios").select("*").eq("user_id", user_id).execute()
    check_supabase_error(portfolios_response, "Failed to retrieve investment portfolios")

    return standardize_response(data=portfolios_response.data)

@router.post("/user/{user_id}/portfolios")
@handle_exceptions
async def create_portfolio(
        user_id: str,
        portfolio: Dict[str, Any] = Body(...),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Create a new investment portfolio
    """
    # Ensure user is creating their own portfolio
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Format portfolio data
    portfolio_data = {
        "user_id": user_id,
        "name": portfolio.get("name"),
        "description": portfolio.get("description"),
        "goal_amount": portfolio.get("goal_amount"),
        "target_date": portfolio.get("target_date"),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    # Insert portfolio
    portfolio_response = supabase.table("investment_portfolios").insert(portfolio_data).execute()
    check_supabase_error(portfolio_response, "Failed to create investment portfolio")

    return standardize_response(data=portfolio_response.data[0], message="Portfolio created successfully")

@router.get("/user/{user_id}/portfolios/{portfolio_id}/investments")
@handle_exceptions
async def get_portfolio_investments(
        user_id: str,
        portfolio_id: int,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Get all investments in a portfolio
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Verify portfolio belongs to user
    portfolio_response = supabase.table("investment_portfolios").select("*").eq("id", portfolio_id).eq("user_id", user_id).execute()
    check_supabase_error(portfolio_response, "Failed to verify portfolio ownership")

    if not portfolio_response.data:
        raise HTTPException(status_code=404, detail="Portfolio not found or doesn't belong to user")

    # Query investments
    investments_response = supabase.table("investments").select("*").eq("portfolio_id", portfolio_id).eq("user_id", user_id).execute()
    check_supabase_error(investments_response, "Failed to retrieve investments")

    return standardize_response(data=investments_response.data)

@router.post("/user/{user_id}/portfolios/{portfolio_id}/investments")
@handle_exceptions
async def add_investment(
        user_id: str,
        portfolio_id: int,
        investment: Dict[str, Any] = Body(...),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Add an investment to a portfolio
    """
    # Ensure user is adding to their own portfolio
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Verify portfolio belongs to user
    portfolio_response = supabase.table("investment_portfolios").select("*").eq("id", portfolio_id).eq("user_id", user_id).execute()
    check_supabase_error(portfolio_response, "Failed to verify portfolio ownership")

    if not portfolio_response.data:
        raise HTTPException(status_code=404, detail="Portfolio not found or doesn't belong to user")

    # Format investment data
    investment_data = {
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "name": investment.get("name"),
        "symbol": investment.get("symbol"),
        "type": investment.get("type", InvestmentType.OTHER),
        "purchase_date": investment.get("purchase_date"),
        "amount": investment.get("amount"),
        "purchase_price": investment.get("purchase_price"),
        "current_price": investment.get("current_price", investment.get("purchase_price")),
        "last_updated": datetime.now().isoformat(),
        "notes": investment.get("notes"),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    # Insert investment
    investment_response = supabase.table("investments").insert(investment_data).execute()
    check_supabase_error(investment_response, "Failed to add investment")

    return standardize_response(data=investment_response.data[0], message="Investment added successfully")

@router.put("/user/{user_id}/investments/{investment_id}")
@handle_exceptions
async def update_investment(
        user_id: str,
        investment_id: int,
        investment: Dict[str, Any] = Body(...),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Update an investment
    """
    # Ensure user is updating their own investment
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Verify investment belongs to user
    investment_response = supabase.table("investments").select("*").eq("id", investment_id).eq("user_id", user_id).execute()
    check_supabase_error(investment_response, "Failed to verify investment ownership")

    if not investment_response.data:
        raise HTTPException(status_code=404, detail="Investment not found or doesn't belong to user")

    # Format update data
    update_data = {
        "name": investment.get("name"),
        "symbol": investment.get("symbol"),
        "type": investment.get("type"),
        "purchase_date": investment.get("purchase_date"),
        "amount": investment.get("amount"),
        "purchase_price": investment.get("purchase_price"),
        "current_price": investment.get("current_price"),
        "notes": investment.get("notes"),
        "updated_at": datetime.now().isoformat()
    }

    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}

    # Update investment
    update_response = supabase.table("investments").update(update_data).eq("id", investment_id).eq("user_id", user_id).execute()
    check_supabase_error(update_response, "Failed to update investment")

    return standardize_response(data=update_response.data[0], message="Investment updated successfully")

@router.delete("/user/{user_id}/investments/{investment_id}")
@handle_exceptions
async def delete_investment(
        user_id: str,
        investment_id: int,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Delete an investment
    """
    # Ensure user is deleting their own investment
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Verify investment belongs to user
    investment_response = supabase.table("investments").select("*").eq("id", investment_id).eq("user_id", user_id).execute()
    check_supabase_error(investment_response, "Failed to verify investment ownership")

    if not investment_response.data:
        raise HTTPException(status_code=404, detail="Investment not found or doesn't belong to user")

    # Delete investment
    delete_response = supabase.table("investments").delete().eq("id", investment_id).eq("user_id", user_id).execute()
    check_supabase_error(delete_response, "Failed to delete investment")

    return standardize_response(message="Investment deleted successfully")

@router.get("/user/{user_id}/investment-summary")
@handle_exceptions
async def get_investment_summary(
        user_id: str,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Get summary of all user investments
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase = get_supabase_client()

    # Query all user investments
    investments_response = supabase.table("investments").select("*").eq("user_id", user_id).execute()
    check_supabase_error(investments_response, "Failed to retrieve investments")

    investments = investments_response.data

    # Calculate summary
    if not investments:
        summary = {
            "total_invested": 0,
            "current_value": 0,
            "total_gain_loss": 0,
            "total_gain_loss_percentage": 0,
            "portfolio_count": 0,
            "investment_count": 0,
            "investment_types": {}
        }
    else:
        total_invested = sum(inv["amount"] * inv["purchase_price"] for inv in investments)
        current_value = sum(inv["amount"] * (inv["current_price"] or inv["purchase_price"]) for inv in investments)

        # Get portfolio count
        portfolios_response = supabase.table("investment_portfolios").select("id").eq("user_id", user_id).execute()
        check_supabase_error(portfolios_response, "Failed to retrieve portfolios")

        # Calculate investment type breakdown
        investment_types = {}
        for inv in investments:
            inv_type = inv["type"]
            if inv_type not in investment_types:
                investment_types[inv_type] = 0

            investment_types[inv_type] += inv["amount"] * (inv["current_price"] or inv["purchase_price"])

        # Format investment type breakdown as percentages
        if current_value > 0:
            investment_types = {k: (v / current_value) * 100 for k, v in investment_types.items()}

        summary = {
            "total_invested": total_invested,
            "current_value": current_value,
            "total_gain_loss": current_value - total_invested,
            "total_gain_loss_percentage": ((current_value / total_invested) - 1) * 100 if total_invested > 0 else 0,
            "portfolio_count": len(portfolios_response.data),
            "investment_count": len(investments),
            "investment_types": investment_types
        }

    return standardize_response(data=summary)