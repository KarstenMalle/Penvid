# File: backend/app/api/preferences.py

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from ..models import UserPreferences, Locale, Currency, Country
from ..database import get_supabase_client
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response
from datetime import datetime

router = APIRouter(prefix="/api", tags=["preferences"])

@router.get("/preferences")
@handle_exceptions
async def get_user_preferences(authenticated_user_id: str = Depends(verify_token)):
    """
    Get the authenticated user's preferences
    """
    supabase = get_supabase_client()

    # Query user preferences
    preferences_response = supabase.table("user_preferences").select("*").eq("user_id", authenticated_user_id).single().execute()

    if preferences_response.error:
        raise HTTPException(status_code=500, detail=f"Database error: {preferences_response.error.message}")

    if not preferences_response.data:
        # If preferences don't exist, create with defaults
        default_preferences = {
            "user_id": authenticated_user_id,
            "locale": Locale.EN,
            "currency": Currency.DKK,  # Default to DKK
            "country": Country.DK,     # Default to Denmark
            "theme": "system",
            "created_at": datetime.now().isoformat(),
        }

        # Insert default preferences
        try:
            insert_response = supabase.table("user_preferences").insert(default_preferences).execute()

            if insert_response.error:
                raise HTTPException(status_code=500, detail=f"Error creating preferences: {insert_response.error.message}")

            return standardize_response(
                data={"preferences": insert_response.data[0] if insert_response.data else default_preferences},
                message="Default preferences created"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating preferences: {str(e)}")

    # Return user preferences
    return standardize_response(
        data={"preferences": preferences_response.data},
        message="Preferences retrieved successfully"
    )


@router.post("/preferences")
@handle_exceptions
async def update_user_preferences(
        locale: Optional[Locale] = Body(None),
        currency: Optional[Currency] = Body(None),
        country: Optional[Country] = Body(None),
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

    # Check if preferences exist
    preferences_check = supabase.table("user_preferences").select("user_id").eq("user_id", authenticated_user_id).execute()

    if preferences_check.error:
        raise HTTPException(status_code=500, detail=f"Database error: {preferences_check.error.message}")

    if not preferences_check.data:
        # Create preferences if they don't exist
        try:
            new_preferences = {
                "user_id": authenticated_user_id,
                "locale": locale or Locale.EN,
                "currency": currency or Currency.DKK,
                "country": country or Country.DK,
                "theme": theme or "system",
                "created_at": datetime.now().isoformat(),
            }

            insert_response = supabase.table("user_preferences").insert(new_preferences).execute()

            if insert_response.error:
                raise HTTPException(status_code=500, detail=f"Error creating preferences: {insert_response.error.message}")

            return standardize_response(
                data={"preferences": insert_response.data[0] if insert_response.data else new_preferences},
                message="Preferences created successfully"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating preferences: {str(e)}")
    else:
        # Update existing preferences
        try:
            update_response = supabase.table("user_preferences").update(update_data).eq("user_id", authenticated_user_id).execute()

            if update_response.error:
                raise HTTPException(status_code=500, detail=f"Error updating preferences: {update_response.error.message}")

            return standardize_response(
                data={"preferences": update_response.data[0] if update_response.data else None},
                message="Preferences updated successfully"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error updating preferences: {str(e)}")