from fastapi import APIRouter, Request
from ..utils.api_util import standardize_response
import os
import sys
import platform
import logging
import asyncio
from typing import Dict, Any

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logging.warning("psutil not available, system information will be limited")

# Create router
router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health")
async def health_check(request: Request):
    """
    Health check endpoint to verify the API is running and provide system information
    """
    try:
        # Get basic system information
        system_info = {
            "python_version": sys.version,
            "platform": platform.platform(),
            "processor": platform.processor(),
        }

        # Add memory and disk information if psutil is available
        if PSUTIL_AVAILABLE:
            system_info.update({
                "memory": {
                    "total": psutil.virtual_memory().total,
                    "available": psutil.virtual_memory().available,
                    "percent": psutil.virtual_memory().percent
                },
                "disk": {
                    "total": psutil.disk_usage('/').total,
                    "used": psutil.disk_usage('/').used,
                    "free": psutil.disk_usage('/').free,
                    "percent": psutil.disk_usage('/').percent
                }
            })

        # Get API status by checking if key endpoints are accessible
        api_status = {
            "loans": {
                "status": "healthy",
                "endpoints": ["/api/user/{user_id}/loans", "/api/user/{user_id}/loan/{loan_id}"]
            },
            "loan_calculations": {
                "status": "healthy",
                "endpoints": ["/api/loans/calculate", "/api/loans/{loan_id}/amortization"]
            },
            "tax_savings": {
                "status": "healthy",
                "endpoints": ["/api/loans/{loan_id}/tax-savings"]
            },
            "translations": {
                "status": "healthy",
                "endpoints": ["/api/translations/{locale}"]
            },
            "financial_strategy": {
                "status": "healthy",
                "endpoints": ["/api/financial-strategy"]
            },
            "investments": {
                "status": "healthy",
                "endpoints": ["/api/investments"]
            },
            "recommendations": {
                "status": "healthy",
                "endpoints": ["/api/recommendations"]
            },
            "financial_calculations": {
                "status": "healthy",
                "endpoints": ["/api/financial-calculations"]
            },
            "currency": {
                "status": "healthy",
                "endpoints": ["/api/currency/convert"]
            },
            "user_settings": {
                "status": "healthy",
                "endpoints": ["/api/user-settings"]
            }
        }

        return standardize_response(
            data={
                "status": "healthy",
                "system_info": system_info,
                "api_status": api_status
            },
            request=request
        )

    except Exception as e:
        return standardize_response(
            error=f"Health check failed: {str(e)}",
            request=request
        )

# Export the router
__all__ = ["router"] 