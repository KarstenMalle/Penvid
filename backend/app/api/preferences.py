# File: backend/app/api/preferences.py

import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from ..database import get_supabase_client
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response
from datetime import datetime

router = APIRouter(prefix="/api", tags=["preferences"])
logger = logging.getLogger(__name__)

# Request models
class PreferenceUpdateRequest(BaseModel):
    locale: Optional[str] = None
    currency: Optional[str] = None
    country: Optional[str] = None
    theme: Optional[str] = None

@router.get("/preferences")
@handle_exceptions
async def get_user_preferences(authenticated_user_id: str = Depends(verify_token)):
    """
    Get the authenticated user's preferences
    """
    supabase = get_supabase_client()

    try:
        # Query user preferences
        preferences_response = supabase.from_('user_preferences').select('*').eq('user_id', authenticated_user_id).execute()

        # Check for errors
        if hasattr(preferences_response, 'error') and preferences_response.error:
            logger.error(f"Database error: {preferences_response.error}")
            raise HTTPException(status_code=500, detail=f"Database error: {preferences_response.error}")

        # Check if preferences exist
        if not preferences_response.data or len(preferences_response.data) == 0:
            # If preferences don't exist, create with defaults using UPSERT
            default_preferences = {
                "user_id": authenticated_user_id,  # CRITICAL: Include the primary key
                "locale": "en",
                "currency": "DKK",
                "country": "DK",
                "theme": "system",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

            # Use UPSERT instead of INSERT
            upsert_response = supabase.from_('user_preferences').upsert(default_preferences).execute()

            # Check for errors
            if hasattr(upsert_response, 'error') and upsert_response.error:
                logger.error(f"Failed to create default preferences: {upsert_response.error}")
                raise HTTPException(status_code=500, detail=f"Failed to create preferences: {upsert_response.error}")

            if not upsert_response.data:
                logger.error("Upsert response has no data")
                raise HTTPException(status_code=500, detail="Failed to create default preferences")

            return standardize_response(
                data={"preferences": upsert_response.data[0]},
                message="Default preferences created"
            )

        # Return user preferences
        return standardize_response(
            data={"preferences": preferences_response.data[0]},
            message="Preferences retrieved successfully"
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_user_preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error accessing preferences: {str(e)}")

@router.post("/preferences")
@handle_exceptions
async def update_user_preferences(
        request: PreferenceUpdateRequest,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Update the authenticated user's preferences using UPSERT
    """
    supabase = get_supabase_client()

    try:
        # First, get current preferences to merge with updates
        current_response = supabase.from_('user_preferences').select('*').eq('user_id', authenticated_user_id).execute()

        # Prepare the full preference object for UPSERT
        if current_response.data and len(current_response.data) > 0:
            # Update existing preferences
            current_prefs = current_response.data[0]
            updated_preferences = {
                "user_id": authenticated_user_id,  # CRITICAL: Always include user_id (primary key)
                "locale": request.locale if request.locale is not None else current_prefs.get("locale", "en"),
                "currency": request.currency if request.currency is not None else current_prefs.get("currency", "DKK"),
                "country": request.country if request.country is not None else current_prefs.get("country", "DK"),
                "theme": request.theme if request.theme is not None else current_prefs.get("theme", "system"),
                "created_at": current_prefs.get("created_at", datetime.now().isoformat()),
                "updated_at": datetime.now().isoformat()
            }
        else:
            # Create new preferences with defaults
            updated_preferences = {
                "user_id": authenticated_user_id,  # CRITICAL: Always include user_id (primary key)
                "locale": request.locale or "en",
                "currency": request.currency or "DKK",
                "country": request.country or "DK",
                "theme": request.theme or "system",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

        # Use UPSERT to insert or update
        logger.info(f"Upserting preferences for user {authenticated_user_id}: {updated_preferences}")
        upsert_response = supabase.from_('user_preferences').upsert(updated_preferences).execute()

        # Check for errors
        if hasattr(upsert_response, 'error') and upsert_response.error:
            logger.error(f"Failed to upsert preferences: {upsert_response.error}")
            raise HTTPException(status_code=500, detail=f"Failed to update preferences: {upsert_response.error}")

        if not upsert_response.data:
            logger.error("Upsert response has no data")
            raise HTTPException(status_code=500, detail="Failed to update preferences")

        return standardize_response(
            data={"preferences": upsert_response.data[0]},
            message="Preferences updated successfully"
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in update_user_preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating preferences: {str(e)}")