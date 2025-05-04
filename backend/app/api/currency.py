# File: backend/app/api/currency.py

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any
from ..models import Currency, CurrencyRate
from ..database import get_supabase_client
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response
from datetime import datetime, timedelta
import requests
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["currency"])

# List of supported currencies
SUPPORTED_CURRENCIES = [c.value for c in Currency]

@router.get("/currency/rates")
@handle_exceptions
async def get_exchange_rates(background_tasks: BackgroundTasks):
    """
    Get current exchange rates for supported currencies
    """
    supabase = get_supabase_client()

    # Check when rates were last updated
    rates_check = supabase.table("currency_rates").select("last_updated").order("last_updated", options={'ascending': False}).limit(1).execute()

    # Initialize update flag
    should_update = False

    if rates_check.error:
        logger.warning(f"Error checking rate timestamps: {rates_check.error.message}")
        should_update = True
    elif not rates_check.data:
        # No rates in database, definitely update
        should_update = True
    else:
        try:
            # Check if rates need updating (older than 1 day)
            last_update = datetime.fromisoformat(rates_check.data[0]["last_updated"].replace("Z", "+00:00"))
            if datetime.now() - last_update > timedelta(days=1):
                should_update = True
        except Exception as e:
            logger.error(f"Error parsing timestamp: {str(e)}")
            should_update = True

    # Trigger background update if needed
    if should_update:
        background_tasks.add_task(update_exchange_rates)

    # Get rates from database
    rates_query = supabase.table("currency_rates").select("*").execute()

    if rates_query.error:
        raise HTTPException(status_code=500, detail=f"Error fetching rates: {rates_query.error.message}")

    # Format rates as dictionary
    rates = {}
    for rate in rates_query.data:
        if rate["base_currency"] not in rates:
            rates[rate["base_currency"]] = {}

        rates[rate["base_currency"]][rate["target_currency"]] = float(rate["rate"])

    # If rates are empty or incomplete, use fallback values
    if not rates or "USD" not in rates or len(rates["USD"]) < len(SUPPORTED_CURRENCIES) - 1:
        fallback_rates = {
            "USD": {"DKK": 6.9, "EUR": 0.92},
            "DKK": {"USD": 0.145, "EUR": 0.134},
            "EUR": {"USD": 1.09, "DKK": 7.45}
        }

        # Merge with any existing rates
        for base, targets in fallback_rates.items():
            if base not in rates:
                rates[base] = {}

            for target, rate_value in targets.items():
                if target not in rates[base]:
                    rates[base][target] = rate_value

    return standardize_response(
        data={"rates": rates},
        message="Exchange rates retrieved successfully"
    )


async def update_exchange_rates():
    """
    Background task to update exchange rates in the database
    """
    supabase = get_supabase_client()
    now = datetime.now().isoformat()

    # Define static exchange rates (for simplicity) - In production, fetch from an API
    # These are rough approximations as of May 2025
    base_rates = {
        "USD": {
            "DKK": 6.90,
            "EUR": 0.92
        },
        "DKK": {
            "USD": 0.145,
            "EUR": 0.134
        },
        "EUR": {
            "USD": 1.09,
            "DKK": 7.45
        }
    }

    # Prepare rate data for insertion/update
    rate_data = []
    for base_currency, targets in base_rates.items():
        for target_currency, rate in targets.items():
            rate_data.append({
                "base_currency": base_currency,
                "target_currency": target_currency,
                "rate": rate,
                "last_updated": now
            })

    # Upsert rates into database
    try:
        if rate_data:
            response = supabase.table("currency_rates").upsert(rate_data).execute()

            if response.error:
                logger.error(f"Error updating exchange rates: {response.error.message}")
            else:
                logger.info(f"Updated {len(rate_data)} exchange rates")
    except Exception as e:
        logger.error(f"Error in update_exchange_rates: {str(e)}")


@router.get("/currency/convert")
@handle_exceptions
async def convert_currency(
        amount: float,
        from_currency: Currency,
        to_currency: Currency
):
    """
    Convert an amount from one currency to another
    """
    if from_currency == to_currency:
        return standardize_response(
            data={"original_amount": amount, "converted_amount": amount},
            message="No conversion needed"
        )

    # Get latest rates
    supabase = get_supabase_client()
    rate_query = supabase.table("currency_rates").select("rate").eq("base_currency", from_currency).eq("target_currency", to_currency).single().execute()

    # If direct rate not found, try reverse rate
    if rate_query.error or not rate_query.data:
        reverse_query = supabase.table("currency_rates").select("rate").eq("base_currency", to_currency).eq("target_currency", from_currency).single().execute()

        if reverse_query.error or not reverse_query.data:
            # If no direct or reverse rate, use USD as intermediate
            if from_currency != "USD" and to_currency != "USD":
                # Get from_currency to USD rate
                from_usd_query = supabase.table("currency_rates").select("rate").eq("base_currency", "USD").eq("target_currency", from_currency).single().execute()

                # Get USD to to_currency rate
                to_usd_query = supabase.table("currency_rates").select("rate").eq("base_currency", "USD").eq("target_currency", to_currency).single().execute()

                if from_usd_query.error or not from_usd_query.data or to_usd_query.error or not to_usd_query.data:
                    # Use fallback rates
                    fallback_rates = {
                        "USD": {"DKK": 6.9, "EUR": 0.92},
                        "DKK": {"USD": 0.145, "EUR": 0.134},
                        "EUR": {"USD": 1.09, "DKK": 7.45}
                    }

                    # Try direct conversion with fallback
                    if from_currency in fallback_rates and to_currency in fallback_rates[from_currency]:
                        rate = fallback_rates[from_currency][to_currency]
                    # Try reverse with fallback
                    elif to_currency in fallback_rates and from_currency in fallback_rates[to_currency]:
                        rate = 1 / fallback_rates[to_currency][from_currency]
                    # Use USD as intermediate with fallback
                    else:
                        usd_to_from = fallback_rates["USD"].get(from_currency, 1)
                        usd_to_to = fallback_rates["USD"].get(to_currency, 1)
                        rate = usd_to_to / usd_to_from
                else:
                    # Calculate using USD as intermediate
                    from_usd_rate = float(from_usd_query.data["rate"])
                    to_usd_rate = float(to_usd_query.data["rate"])
                    rate = to_usd_rate / from_usd_rate
            else:
                # Use fallback rates if all else fails
                fallback_rates = {
                    "USD": {"DKK": 6.9, "EUR": 0.92},
                    "DKK": {"USD": 0.145, "EUR": 0.134},
                    "EUR": {"USD": 1.09, "DKK": 7.45}
                }

                if from_currency in fallback_rates and to_currency in fallback_rates[from_currency]:
                    rate = fallback_rates[from_currency][to_currency]
                elif to_currency in fallback_rates and from_currency in fallback_rates[to_currency]:
                    rate = 1 / fallback_rates[to_currency][from_currency]
                else:
                    rate = 1.0  # Default to 1:1 if all else fails
        else:
            # Use inverse of reverse rate
            rate = 1 / float(reverse_query.data["rate"])
    else:
        # Use direct rate
        rate = float(rate_query.data["rate"])

    # Calculate converted amount
    converted_amount = amount * rate

    return standardize_response(
        data={
            "original_amount": amount,
            "original_currency": from_currency,
            "converted_amount": converted_amount,
            "converted_currency": to_currency,
            "rate": rate
        },
        message="Currency conversion successful"
    )