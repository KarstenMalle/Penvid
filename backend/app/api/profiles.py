# File: backend/app/api/profiles.py

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from ..models import UserProfile
from ..database import get_supabase_client
from ..utils.auth import verify_token
from ..utils.api_util import handle_exceptions, standardize_response
from datetime import datetime

router = APIRouter(prefix="/api", tags=["profiles"])

@router.get("/profile")
@handle_exceptions
async def get_user_profile(authenticated_user_id: str = Depends(verify_token)):
    """
    Get the authenticated user's profile
    """
    supabase = get_supabase_client()

    # Query user profile
    profile_response = supabase.table("profiles").select("*").eq("id", authenticated_user_id).single().execute()

    if profile_response.error:
        raise HTTPException(status_code=500, detail=f"Database error: {profile_response.error.message}")

    if not profile_response.data:
        # Profile doesn't exist yet
        try:
            # Get user details from auth
            user_response = supabase.auth.admin.get_user_by_id(authenticated_user_id)

            if not user_response or not user_response.user:
                raise HTTPException(status_code=404, detail="User not found")

            # Create default profile
            new_profile = {
                "id": authenticated_user_id,
                "email": user_response.user.email,
                "name": user_response.user.user_metadata.get("name") if user_response.user.user_metadata else None,
                "created_at": datetime.now().isoformat(),
            }

            insert_response = supabase.table("profiles").insert(new_profile).execute()

            if insert_response.error:
                raise HTTPException(status_code=500, detail=f"Error creating profile: {insert_response.error.message}")

            return standardize_response(
                data={"profile": insert_response.data[0] if insert_response.data else new_profile},
                message="Profile created successfully"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating profile: {str(e)}")

    # Return user profile
    return standardize_response(
        data={"profile": profile_response.data},
        message="Profile retrieved successfully"
    )


@router.post("/profile")
@handle_exceptions
async def update_user_profile(
        name: Optional[str] = None,
        phone_number: Optional[str] = None,
        avatar_url: Optional[str] = None,
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Update the authenticated user's profile
    """
    supabase = get_supabase_client()

    # Prepare update data with only provided fields
    update_data = {
        "updated_at": datetime.now().isoformat()
    }

    if name is not None:
        update_data["name"] = name
    if phone_number is not None:
        update_data["phone_number"] = phone_number
    if avatar_url is not None:
        update_data["avatar_url"] = avatar_url

    # Check if profile exists
    profile_check = supabase.table("profiles").select("id").eq("id", authenticated_user_id).execute()

    if profile_check.error:
        raise HTTPException(status_code=500, detail=f"Database error: {profile_check.error.message}")

    if not profile_check.data:
        # Create profile if it doesn't exist
        try:
            # Get user details from auth
            user_response = supabase.auth.admin.get_user_by_id(authenticated_user_id)

            if not user_response or not user_response.user:
                raise HTTPException(status_code=404, detail="User not found")

            # Create new profile with provided updates
            new_profile = {
                "id": authenticated_user_id,
                "email": user_response.user.email,
                "created_at": datetime.now().isoformat(),
                **update_data
            }

            insert_response = supabase.table("profiles").insert(new_profile).execute()

            if insert_response.error:
                raise HTTPException(status_code=500, detail=f"Error creating profile: {insert_response.error.message}")

            return standardize_response(
                data={"profile": insert_response.data[0] if insert_response.data else new_profile},
                message="Profile created successfully"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating profile: {str(e)}")
    else:
        # Update existing profile
        try:
            update_response = supabase.table("profiles").update(update_data).eq("id", authenticated_user_id).execute()

            if update_response.error:
                raise HTTPException(status_code=500, detail=f"Error updating profile: {update_response.error.message}")

            return standardize_response(
                data={"profile": update_response.data[0] if update_response.data else None},
                message="Profile updated successfully"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")