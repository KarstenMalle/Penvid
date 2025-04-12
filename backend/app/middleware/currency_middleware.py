# backend/app/middleware/currency_middleware.py
from typing import Callable, Dict, Any, List, Union, Optional
from fastapi import Request, Response
import json
import logging
from ..calculations import convert_currency
from ..database import get_supabase_client
import re

# Configure logging
logger = logging.getLogger("currency_middleware")

# Monetary fields that should be converted
MONETARY_FIELD_PATTERNS = [
    "amount", "balance", "payment", "principal", "interest",
    "total", "value", "net_worth", "surplus", "budget",
    "saving", "cap", "growth", "investment", "debt", "cost",
    "minimum_payment", "extra_payment", "monthly", "annual",
    "initial", "remaining", "paid", "original", "outstanding"
]

EXCLUDED_API_PATTERNS = [
    r"^/api/translations/.*",  # Exclude all translation endpoints
    r"^/api/health$",          # Exclude health check
    r"^/api/docs.*",           # Exclude Swagger docs
    r"^/openapi.json$",        # Exclude OpenAPI schema
    r"^/docs.*",               # Exclude FastAPI auto-docs
    r"^/redoc.*"               # Exclude ReDoc
]

class CurrencyMiddleware:
    """
    Middleware that handles currency conversion for financial API responses
    """

    def __init__(
            self,
            app: Callable,
            default_currency: str = "USD",
            excluded_patterns: Optional[List[str]] = None
    ):
        self.app = app
        self.default_currency = default_currency
        self.excluded_patterns = excluded_patterns or [
            r"^/api/translations/.*",  # Exclude all translation endpoints
            r"^/api/health$",          # Exclude health check
            r"^/docs.*",               # Exclude FastAPI auto-docs
            r"^/openapi.json$"         # Exclude OpenAPI schema
        ]

    async def __call__(self, scope: Dict, receive: Callable, send: Callable):
        if scope["type"] != "http":
            # Pass through non-HTTP requests
            await self.app(scope, receive, send)
            return

        # Create request object for easier handling
        request = Request(scope, receive)

        # Check if this is an excluded path
        path = scope.get("path", "")
        if any(re.match(pattern, path) for pattern in self.excluded_patterns):
            # Skip middleware for excluded paths
            await self.app(scope, receive, send)
            return

        # Extract authorization token to get user_id
        auth_header = None
        for header in scope.get("headers", []):
            if header[0] == b"authorization":
                auth_header = header[1].decode("utf-8")
                break

        # Check for custom currency preference header
        currency_header = None
        for header in scope.get("headers", []):
            if header[0] == b"x-currency-preference":
                currency_header = header[1].decode("utf-8")
                break

        # Continue normal flow if no auth token
        if not auth_header or not auth_header.startswith("Bearer "):
            # If we have a currency header but no auth, still apply conversion using header
            if currency_header:
                scope["state"] = scope.get("state", {})
                scope["state"]["currency_preference"] = currency_header
                target_currency = currency_header
            else:
                await self.app(scope, receive, send)
                return

        user_id = None
        target_currency = self.default_currency

        try:
            # Extract token and get user
            token = auth_header.split("Bearer ")[1]
            supabase = get_supabase_client()
            user_response = supabase.auth.get_user(token)

            if user_response and user_response.user:
                user_id = user_response.user.id
                logger.info(f"User authenticated in currency middleware: {user_id}")

                # Get user's currency preference from profile (using profiles consistently)
                profile_response = supabase.table("profiles").select("currency_preference").eq("id", user_id).execute()

                if profile_response.data and profile_response.data[0].get("currency_preference"):
                    target_currency = profile_response.data[0]["currency_preference"]
                    logger.info(f"User currency preference from profile: {target_currency}")
                else:
                    logger.info(f"No currency preference found in profile, using default: {self.default_currency}")
                    
                # Debug loan access directly with this user ID
                try:
                    loan_debug_response = supabase.table("loans").select("count").eq("user_id", user_id).execute()
                    loan_count = len(loan_debug_response.data) if loan_debug_response.data else 0
                    logger.info(f"Debug - Direct loan check for user {user_id}: Found {loan_count} loans")
                    
                    # Try loan ID 2 lookup to check if it belongs to this user
                    loan2_response = supabase.table("loans").select("*").eq("loan_id", 2).execute()
                    if loan2_response.data and len(loan2_response.data) > 0:
                        loan2_user_id = loan2_response.data[0].get("user_id")
                        logger.info(f"Debug - Loan ID 2 belongs to user: {loan2_user_id}")
                        logger.info(f"Debug - User ID comparison: Request={user_id}, Loan={loan2_user_id}, Equal={user_id == loan2_user_id}")
                except Exception as debug_error:
                    logger.error(f"Debug loan access error: {str(debug_error)}")
            else:
                logger.warning("Could not extract user from token in currency middleware")
        except Exception as e:
            logger.error(f"Error getting user currency preference: {str(e)}")
            # Continue with default currency

        # Override with header value if provided
        if currency_header:
            logger.info(f"Using currency from header: {currency_header} instead of {target_currency}")
            target_currency = currency_header

        # If target currency is same as default, just pass through
        if target_currency == self.default_currency:
            logger.info(f"Target currency {target_currency} is same as default, skipping conversion")
            await self.app(scope, receive, send)
            return

        # Store user_id and currency in scope state for API handlers
        scope["state"] = scope.get("state", {})
        scope["state"]["user_id"] = user_id
        scope["state"]["currency_preference"] = target_currency
        logger.info(f"Currency middleware active: converting to {target_currency} for path {path}")

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

                        # Process JSON data regardless of format
                        logger.debug(f"Processing response data: {str(data)[:100]}...")
                        
                        if isinstance(data, dict):
                            # Check if it's our standard API response format (has status field)
                            is_standard_format = "status" in data
                            
                            if is_standard_format:
                                # This is our standard response format with status field
                                if data.get("status") == "success" and "data" in data:
                                    # Only convert if it's a success response with data
                                    logger.debug(f"Converting standard response data")
                                    data["data"] = self._convert_currency_values(
                                        data["data"],
                                        self.default_currency,
                                        target_currency
                                    )
                            else:
                                # It's raw data (not in our standard format), convert the entire response
                                logger.debug(f"Converting raw response data")
                                data = self._convert_currency_values(
                                    data,
                                    self.default_currency,
                                    target_currency
                                )
                                
                                # Wrap in standard format
                                data = {
                                    "status": "success",
                                    "data": data,
                                    "metadata": {}
                                }

                            # Add currency info to metadata
                            if "metadata" not in data:
                                data["metadata"] = {}
                            data["metadata"]["currency"] = target_currency

                            # Encode the converted data
                            converted_body = json.dumps(data).encode('utf-8')

                            # Create a new headers list excluding any Content-Length
                            new_headers = []
                            for header in response_headers:
                                if header[0].lower() != b'content-length':
                                    new_headers.append(header)

                            # Add a new Content-Length header with the correct length
                            new_headers.append((b'content-length', str(len(converted_body)).encode('utf-8')))
                            
                            # Make sure we have content-type set to JSON
                            has_content_type = False
                            for header in new_headers:
                                if header[0].lower() == b'content-type':
                                    has_content_type = True
                                    break
                                    
                            if not has_content_type:
                                new_headers.append((b'content-type', b'application/json'))

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

    def _convert_currency_values(
            self,
            data: Any,
            from_currency: str,
            to_currency: str
    ) -> Any:
        """Recursively convert all currency values in data structure"""
        try:
            if isinstance(data, dict):
                logger.debug(f"Converting dictionary with {len(data)} keys")
                result = {}
                for key, value in data.items():
                    # Check if this is a currency field that needs conversion
                    needs_conversion = any(pattern in key.lower() for pattern in MONETARY_FIELD_PATTERNS)

                    if needs_conversion and isinstance(value, (int, float)) and value != 0:
                        # Convert the value
                        try:
                            # Special case for DKK conversion for demo - apply 7x multiplier for USD to DKK
                            if from_currency == "USD" and to_currency == "DKK":
                                converted = value * 7.0
                                logger.debug(f"Direct DKK conversion for '{key}': {value} {from_currency} -> {converted} {to_currency}")
                            else:
                                converted = convert_currency(value, from_currency, to_currency)
                                
                            logger.debug(f"Converted '{key}': {value} {from_currency} -> {converted} {to_currency}")
                            result[key] = converted
                        except Exception as e:
                            logger.error(f"Error converting value {key}={value}: {str(e)}")
                            result[key] = value  # Keep original on error
                    else:
                        # Recursively process nested structures
                        result[key] = self._convert_currency_values(value, from_currency, to_currency)
                return result
            elif isinstance(data, list):
                logger.debug(f"Converting list with {len(data)} items")
                return [self._convert_currency_values(item, from_currency, to_currency) for item in data]
            else:
                # Return primitive values unchanged
                return data
        except Exception as e:
            logger.error(f"Error in _convert_currency_values: {str(e)}")
            return data