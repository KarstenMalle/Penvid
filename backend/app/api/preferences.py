# File: backend/app/api/preferences.py

import logging
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from ..models import UserPreferences, Locale, Currency, Country
from ..database import get_supabase_client
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response
from datetime import datetime

router = APIRouter(prefix="/api", tags=["preferences"])

# Add the logger if not already defined
logger = logging.getLogger(__name__)

@router.get("/preferences")
@handle_exceptions
async def get_user_preferences(authenticated_user_id: str = Depends(verify_token)):
    """
    Get the authenticated user's preferences
    """
    supabase = get_supabase_client()

    try:
        # Query user preferences - use from() instead of table()
        preferences_response = supabase.from_('user_preferences').select('*').eq('user_id', authenticated_user_id).execute()

        # Check if preferences exist
        if not preferences_response.data or len(preferences_response.data) == 0:
            # If preferences don't exist, create with defaults
            default_preferences = {
                "user_id": authenticated_user_id,
                "locale": "en",
                "currency": "DKK",
                "country": "DK",
                "theme": "system",
                "created_at": datetime.now().isoformat(),
            }

            # Use from() for insertion
            insert_response = supabase.from_('user_preferences').insert(default_preferences).execute()

            if not insert_response.data:
                logger.error("Failed to create default preferences")
                raise HTTPException(status_code=500, detail="Failed to create default preferences")

            return standardize_response(
                data={"preferences": insert_response.data[0]},
                message="Default preferences created"
            )

        # Return user preferences
        return standardize_response(
            data={"preferences": preferences_response.data[0]},
            message="Preferences retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Preferences API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error accessing preferences: {str(e)}")

@router.post("/preferences")
@handle_exceptions
async def update_user_preferences(
        locale: Optional[str] = Body(None),
        currency: Optional[str] = Body(None),
        country: Optional[str] = Body(None),
        theme: Optional[str] = Body(None),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Update the authenticated user's preferences
    """
    supabase = get_supabase_client()

    # Prepare update data with only provided fields
    update_data = {
        "updated_at": datetime.now().isoformat()
    }

    if locale is not None:
        update_data["locale"] = locale
    if currency is not None:
        update_data["currency"] = currency
    if country is not None:
        update_data["country"] = country
    if theme is not None:
        update_data["theme"] = theme

    try:
        # Check if preferences exist
        preferences_check = supabase.from_('user_preferences').select('user_id').eq('user_id', authenticated_user_id).execute()

        # Check if preferences exist
        if not preferences_check.data or len(preferences_check.data) == 0:
            # Create preferences if they don't exist
            new_preferences = {
                "user_id": authenticated_user_id,
                "locale": locale or "en",
                "currency": currency or "DKK",
                "country": country or "DK",
                "theme": theme or "system",
                "created_at": datetime.now().isoformat(),
            }

            # Use from() for insertion
            insert_response = supabase.from_('user_preferences').insert(new_preferences).execute()

            if not insert_response.data:
                logger.error("Failed to create preferences")
                raise HTTPException(status_code=500, detail="Failed to create preferences")

            return standardize_response(
                data={"preferences": insert_response.data[0]},
                message="Preferences created successfully"
            )
        else:
            # Update existing preferences
            update_response = supabase.from_('user_preferences').update(update_data).eq('user_id', authenticated_user_id).execute()

            if not update_response.data:
                logger.error("Failed to update preferences")
                raise HTTPException(status_code=500, detail="Failed to update preferences")

            return standardize_response(
                data={"preferences": update_response.data[0]},
                message="Preferences updated successfully"
            )
    except Exception as e:
        logger.error(f"Preferences API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating preferences: {str(e)}")