# backend/app/utils/auth_helpers.py
from fastapi import HTTPException, status
import logging
from typing import Optional, Dict, Any
from ..database import get_supabase_client

logger = logging.getLogger(__name__)

async def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Verify a token with Supabase and return the user data

    Args:
        token: The JWT token to verify

    Returns:
        Dictionary with user data

    Raises:
        HTTPException: If token is invalid
    """
    if not token:
        logger.error("No token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Get Supabase client
        supabase = get_supabase_client()

        # Verify token
        response = supabase.auth.get_user(token)

        if response.error:
            logger.error(f"Token verification error: {response.error.message}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {response.error.message}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not response.user:
            logger.error("No user found for token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: No user found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return response.user

    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error verifying token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )