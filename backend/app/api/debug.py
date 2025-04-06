# backend/app/api/debug.py
from fastapi import APIRouter, Request, Body
from typing import Dict, Any, Optional
from ..calculations import convert_currency
import re

router = APIRouter(prefix="/api/debug", tags=["debug"])

# Monetary fields that should be converted
MONETARY_FIELD_PATTERNS = [
    "amount", "balance", "payment", "principal", "interest",
    "total", "value", "net_worth", "surplus", "budget",
    "saving", "cap", "growth", "investment", "debt", "cost",
    "minimum_payment", "extra_payment", "monthly", "annual",
    "price", "money", "fee", "expense", "income", "revenue",
    "salary", "wage"  # Adding more patterns to catch additional monetary fields
]

@router.post("/convert-currency")
async def debug_currency_conversion(
        data: Dict[str, Any] = Body(...),
        from_currency: str = "USD",
        to_currency: Optional[str] = None,
        request: Request = None
):
    """
    Debug endpoint to simulate currency conversion on any JSON data
    """
    # Get currency preference from header if not provided
    if not to_currency and request:
        to_currency = request.headers.get("X-Currency-Preference")

    # Default to DKK if not specified
    to_currency = to_currency or "DKK"

    # Use the internal conversion logic
    converted_data = convert_currency_values(data, from_currency, to_currency)

    # Return both original and converted data for comparison
    return {
        "status": "success",
        "metadata": {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "conversion_patterns": MONETARY_FIELD_PATTERNS
        },
        "data": {
            "original": data,
            "converted": converted_data
        }
    }

def convert_currency_values(
        data: Any,
        from_currency: str,
        to_currency: str
) -> Any:
    """Recursively convert all currency values in data structure"""
    if from_currency == to_currency:
        return data

    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            # Check if this is a currency field that needs conversion
            needs_conversion = any(pattern in key.lower() for pattern in MONETARY_FIELD_PATTERNS)
            field_info = {
                "field": key,
                "matches_pattern": needs_conversion,
                "value_type": type(value).__name__,
                "converted": needs_conversion and isinstance(value, (int, float)) and value != 0
            }

            if needs_conversion and isinstance(value, (int, float)) and value != 0:
                # Convert the value
                try:
                    result[key] = convert_currency(value, from_currency, to_currency)
                    # Add debug info
                    if key + "_debug" not in result:
                        result[key + "_debug"] = field_info
                except Exception as e:
                    # Keep original on error
                    result[key] = value
                    if key + "_debug" not in result:
                        result[key + "_debug"] = {**field_info, "error": str(e)}
            else:
                # Recursively process nested structures
                result[key] = convert_currency_values(value, from_currency, to_currency)
                # Add debug info for fields that look like they should be monetary
                if key.lower() in MONETARY_FIELD_PATTERNS and key + "_debug" not in result:
                    result[key + "_debug"] = field_info
        return result

    elif isinstance(data, list):
        return [convert_currency_values(item, from_currency, to_currency) for item in data]

    else:
        # Return primitive values unchanged
        return data