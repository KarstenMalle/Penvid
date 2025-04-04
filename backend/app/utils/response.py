# backend/app/utils/response.py - Standardized API responses

from typing import Any, Dict, List, Optional, Union
from fastapi.responses import JSONResponse
from pydantic import BaseModel

class StandardResponse(BaseModel):
    """Standard API response model"""
    status: str = "success"
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

def success_response(
        data: Any = None,
        message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        status_code: int = 200
) -> JSONResponse:
    """
    Create a standardized success response

    Args:
        data: Response data
        message: Optional success message
        metadata: Optional metadata
        status_code: HTTP status code (default: 200)

    Returns:
        JSONResponse with standardized format
    """
    return JSONResponse(
        status_code=status_code,
        content=StandardResponse(
            status="success",
            data=data,
            message=message,
            metadata=metadata
        ).dict(exclude_none=True)
    )

def error_response(
        error: str,
        data: Any = None,
        metadata: Optional[Dict[str, Any]] = None,
        status_code: int = 400
) -> JSONResponse:
    """
    Create a standardized error response

    Args:
        error: Error message
        data: Optional data to include with error
        metadata: Optional metadata
        status_code: HTTP status code (default: 400)

    Returns:
        JSONResponse with standardized format
    """
    return JSONResponse(
        status_code=status_code,
        content=StandardResponse(
            status="error",
            error=error,
            data=data,
            metadata=metadata
        ).dict(exclude_none=True)
    )

def format_validation_errors(errors: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """
    Format validation errors from Pydantic validation

    Args:
        errors: List of Pydantic errors

    Returns:
        Dictionary with field names as keys and lists of error messages as values
    """
    formatted_errors: Dict[str, List[str]] = {}

    for error in errors:
        loc = error.get("loc", [])
        if len(loc) > 0:
            field = str(loc[-1])  # Get the field name
            message = error.get("msg", "Invalid value")

            if field not in formatted_errors:
                formatted_errors[field] = []

            formatted_errors[field].append(message)

    return formatted_errors

def validation_error_response(
        errors: List[Dict[str, Any]],
        message: str = "Validation error",
        status_code: int = 422
) -> JSONResponse:
    """
    Create a standardized validation error response

    Args:
        errors: List of Pydantic validation errors
        message: Error message (default: "Validation error")
        status_code: HTTP status code (default: 422)

    Returns:
        JSONResponse with standardized format
    """
    formatted_errors = format_validation_errors(errors)

    return JSONResponse(
        status_code=status_code,
        content=StandardResponse(
            status="error",
            error=message,
            data={"errors": formatted_errors},
            metadata={"error_count": len(errors)}
        ).dict(exclude_none=True)
    )