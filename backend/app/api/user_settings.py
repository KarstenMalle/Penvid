# backend/app/api/user_settings.py
from fastapi import APIRouter, Depends, HTTPException
from ..models import UserSettings
from ..database import get_supabase_client
from ..utils.auth import verify_token

router = APIRouter(prefix="/api", tags=["user_settings"])

@router.get("/user/{user_id}/settings", response_model=UserSettings)
async def get_user_settings(user_id: str, authenticated_user_id: str = Depends(verify_token)):
    """
    Get a user's financial calculation settings
    """
    # Ensure user is accessing their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Query user settings from database
        settings_response = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()

        if settings_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {settings_response.error.message}")

        # If settings exist, return them
        if settings_response.data:
            settings = settings_response.data[0]
            return UserSettings(
                expected_inflation=settings.get('expected_inflation', 0.025),
                expected_investment_return=settings.get('expected_investment_return', 0.07),
                risk_tolerance=settings.get('risk_tolerance', 0.2)
            )

        # If no settings exist, return defaults
        return UserSettings()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user settings: {str(e)}")

@router.post("/user/{user_id}/settings", response_model=UserSettings)
async def update_user_settings(
        user_id: str,
        settings: UserSettings,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Update a user's financial calculation settings
    """
    # Ensure user is updating their own data
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        supabase = get_supabase_client()

        # Check if settings exist
        settings_response = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()

        if settings_response.error:
            raise HTTPException(status_code=500, detail=f"Database error: {settings_response.error.message}")

        settings_data = {
            "user_id": user_id,
            "expected_inflation": settings.expected_inflation,
            "expected_investment_return": settings.expected_investment_return,
            "risk_tolerance": settings.risk_tolerance,
            "updated_at": "now()"
        }

        # Update or insert settings
        if settings_response.data:
            # Update existing settings
            update_response = supabase.table("user_settings").update(settings_data).eq("user_id", user_id).execute()

            if update_response.error:
                raise HTTPException(status_code=500, detail=f"Database error: {update_response.error.message}")
        else:
            # Insert new settings
            insert_response = supabase.table("user_settings").insert(settings_data).execute()

            if insert_response.error:
                raise HTTPException(status_code=500, detail=f"Database error: {insert_response.error.message}")

        return settings

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user settings: {str(e)}")