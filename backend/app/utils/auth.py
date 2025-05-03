# backend/app/utils/auth.py

from fastapi import Depends, HTTPException, status, Header
from typing import Optional
from ..database import get_supabase_client
import time

async def verify_token(authorization: Optional[str] = Header(None)):
    """
    Verify JWT token and return user_id if valid

    Args:
        authorization: Authorization header containing the JWT token

    Returns:
        user_id: The ID of the authenticated user

    Raises:
        HTTPException: If the token is invalid or missing
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Extract token from Authorization header
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization format, expected 'Bearer [token]'",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = parts[1]

        # Verify token with Supabase (with retry logic for potential intermittent issues)
        max_retries = 3
        retry_delay = 0.5  # seconds
        last_error = None

        for attempt in range(max_retries):
            try:
                # Get Supabase client
                supabase = get_supabase_client()

                # Verify token
                user_data = supabase.auth.get_user(token)

                if user_data.error:
                    last_error = user_data.error
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Invalid token: {user_data.error.message}",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

                if not user_data.user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token: No user found",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

                return user_data.user.id

            except HTTPException:
                # Re-raise HTTP exceptions
                raise
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Authentication error: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # If we reach here, all retries failed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed after {max_retries} attempts: {str(last_error)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )