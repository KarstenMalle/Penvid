# backend/app/api/debug.py

from fastapi import APIRouter, Request
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/debug", tags=["debug"])

@router.get("/health")
async def debug_health():
    """
    Check API connectivity with detailed information
    """
    return {
        "status": "ok",
        "message": "API is responding correctly",
        "info": {
            "server_time": datetime.now().isoformat(),
            "environment": os.getenv("ENVIRONMENT", "development")
        }
    }

@router.get("/user-info")
async def debug_user_info(request: Request):
    """
    Debug endpoint to test user authentication
    """
    try:
        # Extract authorization header
        headers = dict(request.headers.items())
        auth_header = headers.get("authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return {
                "status": "error",
                "message": "No valid authorization header found",
                "headers_found": list(headers.keys())
            }

        # Try to get user info
        token = auth_header.split("Bearer ")[1]
        supabase = get_supabase_client()

        try:
            user_response = supabase.auth.get_user(token)

            if user_response and user_response.user:
                user_id = user_response.user.id

                # Try to get currency preference
                profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()

                return {
                    "status": "success",
                    "user_id": user_id,
                    "auth_working": True,
                    "profile_found": bool(profile_response.data),
                    "currency_preference": profile_response.data[0].get("currency_preference") if profile_response.data else None
                }
            else:
                return {
                    "status": "error",
                    "message": "Token validation failed",
                    "auth_working": False
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Supabase auth error: {str(e)}",
                "auth_working": False
            }

    except Exception as e:
        logger.exception("Error in debug endpoint")
        return {
            "status": "error",
            "message": f"Server error: {str(e)}"
        }