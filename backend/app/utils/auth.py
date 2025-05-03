# backend/app/utils/auth.py
from fastapi import Depends, HTTPException, status, Header, Request
from typing import Optional, Dict, Any
import logging
from ..database import get_supabase_client

# Setup logging
logger = logging.getLogger(__name__)

async def verify_token(authorization: Optional[str] = Header(None), request: Request = None) -> str:
    """
    Verify JWT token and return user_id if valid

    Args:
        authorization: Authorization header containing the JWT token
        request: FastAPI request object for logging

    Returns:
        user_id: The ID of the authenticated user

    Raises:
        HTTPException: If the token is invalid or missing
    """
    client_ip = request.client.host if request else "unknown"
    logger.info(f"Verifying token from {client_ip}")

    if not authorization:
        logger.warning(f"Missing authentication token from {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Extract token from Authorization header
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            logger.warning(f"Invalid authorization format from {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization format, expected 'Bearer [token]'",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = parts[1]
        token_preview = token[:10] + "..." if len(token) > 10 else token
        logger.info(f"Verifying token {token_preview} from {client_ip}")

        # Get Supabase client
        supabase = get_supabase_client()

        # Verify token
        user_data = supabase.auth.get_user(token)

        if user_data.error:
            logger.error(f"Token verification error: {user_data.error.message}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {user_data.error.message}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user_data.user:
            logger.error(f"No user found for token from {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: No user found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = user_data.user.id
        logger.info(f"Token successfully verified for user {user_id[:8]}... from {client_ip}")
        return user_id

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in verify_token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )