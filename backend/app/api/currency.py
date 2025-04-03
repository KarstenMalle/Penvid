# backend/app/api/currency.py
from fastapi import APIRouter, HTTPException
from ..models import CurrencyConversionRequest, CurrencyConversionResponse
from ..calculations import convert_currency, get_exchange_rates

router = APIRouter(prefix="/api", tags=["currency"])

@router.post("/currency/convert", response_model=CurrencyConversionResponse)
async def convert_currency_endpoint(request: CurrencyConversionRequest):
    """
    Convert a monetary amount between currencies
    """
    try:
        converted_amount = convert_currency(
            amount=request.amount,
            from_currency=request.from_currency,
            to_currency=request.to_currency
        )

        return CurrencyConversionResponse(
            original_amount=request.amount,
            original_currency=request.from_currency,
            converted_amount=converted_amount,
            converted_currency=request.to_currency
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting currency: {str(e)}")

@router.get("/currency/rates")
async def get_exchange_rates_endpoint():
    """
    Get current exchange rates with USD as base
    """
    try:
        rates = get_exchange_rates(base_currency="USD")
        return {"rates": rates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching exchange rates: {str(e)}")