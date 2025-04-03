# backend/app/utils/api_util.py
from functools import wraps

from fastapi import HTTPException, Request
from supabase import Client
from typing import Dict, Any, Optional, Callable, TypeVar
import traceback
import logging

# Set up logger
logger = logging.getLogger("api_utils")

T = TypeVar('T')

class APIResponse:
    """Standardized API response object"""
    def __init__(
            self,
            data: Any = None,
            error: Optional[str] = None,
            status: str = "success",
            message: Optional[str] = None,
            metadata: Optional[Dict[str, Any]] = None
    ):
        self.status = status
        self.data = data
        self.error = error
        self.message = message
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "status": self.status,
        }

        if self.data is not None:
            result["data"] = self.data

        if self.error:
            result["error"] = self.error

        if self.message:
            result["message"] = self.message

        if self.metadata:
            result["metadata"] = self.metadata

        return result

    @property
    def has_error(self) -> bool:
        return self.error is not None

def handle_exceptions(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator to handle exceptions in API endpoint functions"""
    @wraps(func)  # Add this to preserve function metadata
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException as e:
            # Re-raise FastAPI HTTP exceptions
            raise
        except Exception as e:
            # Log the error
            logger.error(f"Error in {func.__name__}: {str(e)}")
            logger.error(traceback.format_exc())

            # Raise 500 Internal Server Error
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

    return wrapper

def extract_auth_user(request: Request) -> str:
    """Extract authenticated user ID from request state"""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    return user_id

def check_supabase_error(response, error_message: str = "Database error"):
    """Check for errors in Supabase response and raise appropriate exception"""
    if hasattr(response, 'error') and response.error:
        logger.error(f"Supabase error: {response.error.message}")
        raise HTTPException(
            status_code=500,
            detail=f"{error_message}: {response.error.message}"
        )

    return response

def standardize_response(
        data: Any = None,
        error: Optional[str] = None,
        message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a standardized API response"""
    return APIResponse(
        data=data,
        error=error,
        status="error" if error else "success",
        message=message,
        metadata=metadata
    ).to_dict()