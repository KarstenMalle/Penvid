# backend/app/services/currency_service.py
import requests
from typing import Dict, Optional
import logging
from cachetools import cached, TTLCache
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

# Cache for exchange rates, with 24-hour TTL
exchange_rate_cache = TTLCache(maxsize=100, ttl=86400)

class CurrencyService:
    """
    Centralized service for handling all currency conversions in the application
    All database values are stored in USD and converted only when needed
    """

    BASE_CURRENCY = "USD"

    @staticmethod
    @cached(cache=exchange_rate_cache)
    def get_exchange_rates(base_currency: str = "USD") -> Dict[str, float]:
        """
        Fetch exchange rates from an API with caching
        Uses USD as base currency by default
        """
        try:
            url = f"https://api.exchangerate-api.com/v4/latest/{base_currency}"
            response = requests.get(url, timeout=5)
            data = response.json()

            # Log successful fetching of rates
            logger.info(f"Successfully fetched exchange rates with base currency {base_currency}")

            # Return the rates or fallback
            return data.get('rates', {"USD": 1.0, "DKK": 6.8991310126})
        except Exception as e:
            logger.error(f"Error fetching exchange rates: {e}")
            # Fallback rates
            return {"USD": 1.0, "DKK": 6.8991310126}

    @staticmethod
    def convert_currency(
            amount: float,
            from_currency: str = "USD",
            to_currency: str = "USD",
            rates: Optional[Dict[str, float]] = None
    ) -> float:
        """
        Convert amount between currencies
        If rates are provided, uses them instead of fetching new ones
        """
        if amount == 0 or from_currency == to_currency:
            return amount

        # Get rates if not provided
        if not rates:
            rates = CurrencyService.get_exchange_rates("USD")

        # If base currency isn't USD, normalize to USD first
        amount_in_usd = amount
        if from_currency != "USD":
            if from_currency not in rates:
                logger.warning(f"Currency {from_currency} not found in rates, using 1.0")
                return amount
            amount_in_usd = amount / rates.get(from_currency, 1.0)

        # Then convert from USD to target currency
        if to_currency == "USD":
            return amount_in_usd

        if to_currency not in rates:
            logger.warning(f"Currency {to_currency} not found in rates, using USD value")
            return amount_in_usd

        return amount_in_usd * rates.get(to_currency, 1.0)

    @staticmethod
    def convert_monetary_values(
            data: Dict,
            from_currency: str,
            to_currency: str,
            fields: list
    ) -> Dict:
        """
        Convert all monetary values in a dictionary from one currency to another

        Args:
            data: Dictionary containing monetary values
            from_currency: Source currency
            to_currency: Target currency
            fields: List of field names to convert

        Returns:
            Dictionary with converted values
        """
        if from_currency == to_currency:
            return data

        # Get rates once to avoid multiple API calls
        rates = CurrencyService.get_exchange_rates("USD")

        # Clone the data to avoid modifying the original
        result = {**data}

        # Convert each field
        for field in fields:
            if field in result and isinstance(result[field], (int, float)):
                result[field] = CurrencyService.convert_currency(
                    result[field],
                    from_currency,
                    to_currency,
                    rates
                )

        return result

    @staticmethod
    def format_currency(
            amount: float,
            currency: str = "USD",
            locale: str = "en-US",
            decimal_places: int = 2
    ) -> str:
        """
        Format a currency amount according to the specified locale and currency
        """
        try:
            from babel.numbers import format_currency
            return format_currency(amount, currency, locale=locale)
        except ImportError:
            # Fallback if babel is not available
            symbol = {"USD": "$", "DKK": "kr"}.get(currency, currency)
            return f"{symbol} {amount:.{decimal_places}f}"