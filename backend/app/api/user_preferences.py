# backend/app/api/user_preferences.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response
from ..services.user_preferences_service import UserPreferencesService

router = APIRouter(prefix="/api", tags=["user_preferences"])

@router.get("/user/{user_id}/preferences")
@handle_exceptions
async def get_user_preferences(
        user_id: str,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Get a user's preferences (language, currency, country)
    """
    # Ensure user is accessing their own preferences
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    preferences = await UserPreferencesService.get_user_preferences(user_id)

    return standardize_response(data=preferences)

@router.put("/user/{user_id}/preferences")
@handle_exceptions
async def update_user_preferences(
        user_id: str,
        preferences: Dict[str, str] = Body(...),
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Update a user's preferences (language, currency, country)
    """
    # Ensure user is updating their own preferences
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await UserPreferencesService.update_user_preferences(user_id, preferences)

    if not result["success"]:
        return standardize_response(error=result["message"])

    return standardize_response(
        data=result["preferences"],
        message=result["message"]
    )