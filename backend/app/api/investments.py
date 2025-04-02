from fastapi import APIRouter, HTTPException
from ..models import InvestmentRequest, InvestmentResponse
from ..calculations import calculate_investment_projection, convert_currency

router = APIRouter(prefix="/api", tags=["investments"])

@router.post("/investment/projection", response_model=InvestmentResponse)
async def get_investment_projection(request: InvestmentRequest):
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