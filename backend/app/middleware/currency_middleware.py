# backend/app/middleware/currency_middleware.py
from typing import Callable, Dict, Any, List, Union, Optional
from fastapi import Request, Response
import json
import logging
from ..calculations import convert_currency
import re

# Configure logging
logger = logging.getLogger("currency_middleware")

# List of API paths that should be processed for currency conversion
FINANCIAL_API_PATTERNS = [
    r"^/api/loans/.*",
    r"^/api/investments/.*",
    r"^/api/financial-strategy/.*",
    r"^/api/loan_calculations/.*",
    r"^/api/recommendations/.*",
    r"^/api/user/.*/loans/.*"
]

# APIs that should be explicitly excluded
EXCLUDED_API_PATTERNS = [
    r"^/api/translations/.*",
    r"^/api/user/.*/settings",
    r"^/api/currency/convert",  # Exclude the currency conversion endpoint itself
    r"^/api/currency/rates",     # Exclude exchange rates endpoint
    r"^/api/health"
]

# Monetary fields that should be converted
MONETARY_FIELD_PATTERNS = [
    "amount", "balance", "payment", "principal", "interest",
    "total", "value", "net_worth", "surplus", "budget",
    "saving", "cap", "growth", "investment", "debt", "cost",
    "minimum_payment", "extra_payment", "monthly", "annual",
    "initial", "remaining", "paid", "original", "outstanding"
]

class CurrencyMiddleware:
    """
    Middleware that handles currency conversion for financial API responses
    """

    def __init__(
            self,
            app: Callable,
            default_currency: str = "USD"
    ):
        self.app = app
        self.default_currency = default_currency

    async def __call__(self, scope: Dict, receive: Callable, send: Callable):
        if scope["type"] != "http":
            # Pass through non-HTTP requests
            await self.app(scope, receive, send)
            return

        # Extract path to check if it's a financial API
        path = scope["path"]

        # Check if this path should be processed
        should_process = any(re.match(pattern, path) for pattern in FINANCIAL_API_PATTERNS)
        should_exclude = any(re.match(pattern, path) for pattern in EXCLUDED_API_PATTERNS)

        if not should_process or should_exclude:
            # Skip processing for non-financial APIs
            await self.app(scope, receive, send)
            return

        # Create request object for easier handling
        request = Request(scope, receive)

        # Extract currency preference from headers or query parameters
        target_currency = await self._get_currency_preference(request)

        # If no target currency or same as default, pass through
        if not target_currency or target_currency == self.default_currency:
            await self.app(scope, receive, send)
            return

        # Collect response chunks
        response_body = bytearray()
        response_headers = []
        response_status = 200

        # Create a function to capture response
        async def capture_response(message):
            nonlocal response_body, response_headers, response_status

            if message["type"] == "http.response.start":
                # Capture status code and headers but don't send yet
                response_status = message["status"]
                response_headers = message["headers"]

            elif message["type"] == "http.response.body":
                # Capture body chunks
                chunk = message.get("body", b"")
                if chunk:
                    response_body.extend(chunk)

                # If this is the final chunk, process and send the response
                if not message.get("more_body", False):
                    try:
                        # Try to parse as JSON
                        body_str = response_body.decode('utf-8')
                        data = json.loads(body_str)

                        # Only convert if it's a success response with data
                        if isinstance(data, dict) and data.get("status") == "success" and "data" in data:
                            # Convert the data
                            converted_data = self._convert_currency_values(
                                data,
                                self.default_currency,
                                target_currency
                            )

                            # Encode the converted data
                            converted_body = json.dumps(converted_data).encode('utf-8')

                            # Create a new headers list excluding any Content-Length
                            new_headers = []
                            for header in response_headers:
                                if header[0].lower() != b'content-length':
                                    new_headers.append(header)

                            # Add a new Content-Length header with the correct length
                            new_headers.append((b'content-length', str(len(converted_body)).encode('utf-8')))

                            # Send the response start with updated headers
                            await send({
                                "type": "http.response.start",
                                "status": response_status,
                                "headers": new_headers
                            })

                            # Send the converted body
                            await send({
                                "type": "http.response.body",
                                "body": converted_body,
                                "more_body": False
                            })

                            return
                    except Exception as e:
                        logger.error(f"Error in currency conversion middleware: {str(e)}")
                        # If error, fall back to original response

                # If we reach here, either it's not JSON, not success response, or error occurred
                # Send the original response
                await send({
                    "type": "http.response.start",
                    "status": response_status,
                    "headers": response_headers
                })

                await send({
                    "type": "http.response.body",
                    "body": bytes(response_body),
                    "more_body": False
                })
            else:
                # Pass through other message types
                await send(message)

        # Process the request with our custom capture function
        try:
            await self.app(scope, receive, capture_response)
        except Exception as e:
            logger.error(f"Unhandled exception in currency middleware: {str(e)}")
            # If the middleware fails, send an error response
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"application/json")]
            })
            await send({
                "type": "http.response.body",
                "body": json.dumps({
                    "status": "error",
                    "error": "Internal server error in currency conversion middleware"
                }).encode('utf-8')
            })

    async def _get_currency_preference(self, request: Request) -> Optional[str]:
        """Extract currency preference from request"""
        # Check headers first (most reliable)
        try:
            headers = dict(request.headers.items())
            currency = headers.get("x-currency-preference")

            # If not in headers, check query parameters
            if not currency:
                query_params = dict(request.query_params)
                currency = query_params.get("currency")

            # For POST/PUT requests, check the body
            if not currency and request.method in ["POST", "PUT"]:
                try:
                    body_bytes = await request.body()
                    if body_bytes:
                        body = json.loads(body_bytes.decode())
                        currency = body.get("currency")
                except:
                    # Failed to parse body, just continue
                    pass

            return currency
        except Exception as e:
            logger.error(f"Error extracting currency preference: {str(e)}")
            return None

    def _convert_currency_values(
            self,
            data: Any,
            from_currency: str,
            to_currency: str
    ) -> Any:
        """Recursively convert all currency values in data structure"""
        try:
            if isinstance(data, dict):
                result = {}
                for key, value in data.items():
                    # Check if this is a currency field that needs conversion
                    needs_conversion = any(pattern in key.lower() for pattern in MONETARY_FIELD_PATTERNS)

                    # Special handling for payment_analysis which requires deeper conversion
                    if key == "payment_analysis" and isinstance(value, dict):
                        result[key] = self._convert_payment_analysis_section(value, from_currency, to_currency)
                    elif needs_conversion and isinstance(value, (int, float)) and value != 0:
                        # Convert the value
                        try:
                            result[key] = convert_currency(value, from_currency, to_currency)
                        except Exception as e:
                            logger.error(f"Error converting value {key}={value}: {str(e)}")
                            result[key] = value  # Keep original on error
                    else:
                        # Recursively process nested structures
                        result[key] = self._convert_currency_values(value, from_currency, to_currency)
                return result
            elif isinstance(data, list):
                return [self._convert_currency_values(item, from_currency, to_currency) for item in data]
            else:
                # Return primitive values unchanged
                return data
        except Exception as e:
            logger.error(f"Error in _convert_currency_values: {str(e)}")
            return data

    def _convert_payment_analysis_section(self, payment_analysis: Dict, from_currency: str, to_currency: str):
        """Convert all monetary values in a payment analysis section"""
        try:
            if not isinstance(payment_analysis, dict):
                return payment_analysis

            result = {}
            for key, value in payment_analysis.items():
                # Skip percentage fields
                if "percent" in key.lower() or "rate" in key.lower():
                    result[key] = value
                # Convert numeric values that aren't percentages
                elif isinstance(value, (int, float)) and value != 0:
                    result[key] = convert_currency(value, from_currency, to_currency)
                # Handle nested dictionaries
                elif isinstance(value, dict):
                    result[key] = self._convert_payment_analysis_section(value, from_currency, to_currency)
                # Handle lists of dictionaries
                elif isinstance(value, list) and all(isinstance(item, dict) for item in value):
                    result[key] = [self._convert_payment_analysis_section(item, from_currency, to_currency)
                                   for item in value]
                else:
                    result[key] = value

            return result
        except Exception as e:
            logger.error(f"Error in _convert_payment_analysis_section: {str(e)}")
            return payment_analysis