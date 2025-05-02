# backend/app/services/user_preferences_service.py
from typing import Dict, Any, Optional
import logging
from ..database import get_supabase_client

# Set up logging
logger = logging.getLogger(__name__)

class UserPreferencesService:
    """
    Service for managing user preferences including language, currency, and country
    """

    DEFAULT_LANGUAGE = "en"
    DEFAULT_CURRENCY = "USD"
    DEFAULT_COUNTRY = "US"

    @staticmethod
    async def get_user_preferences(user_id: str) -> Dict[str, str]:
        """
        Get a user's preferences

        Args:
            user_id: The user's ID

        Returns:
            Dictionary with language, currency, and country preferences
        """
        try:
            supabase = get_supabase_client()

            # Query the profiles table
            response = supabase.table("profiles").select(
                "language_preference, currency_preference, country_preference"
            ).eq("id", user_id).execute()

            if response.error:
                logger.error(f"Error fetching user preferences: {response.error.message}")
                return {
                    "language": UserPreferencesService.DEFAULT_LANGUAGE,
                    "currency": UserPreferencesService.DEFAULT_CURRENCY,
                    "country": UserPreferencesService.DEFAULT_COUNTRY
                }

            if not response.data:
                logger.warning(f"No profile found for user {user_id}")
                return {
                    "language": UserPreferencesService.DEFAULT_LANGUAGE,
                    "currency": UserPreferencesService.DEFAULT_CURRENCY,
                    "country": UserPreferencesService.DEFAULT_COUNTRY
                }

            user_data = response.data[0]

            # Return user preferences, falling back to defaults if not set
            return {
                "language": user_data.get("language_preference") or UserPreferencesService.DEFAULT_LANGUAGE,
                "currency": user_data.get("currency_preference") or UserPreferencesService.DEFAULT_CURRENCY,
                "country": user_data.get("country_preference") or UserPreferencesService.DEFAULT_COUNTRY
            }

        except Exception as e:
            logger.error(f"Error in get_user_preferences: {str(e)}")
            return {
                "language": UserPreferencesService.DEFAULT_LANGUAGE,
                "currency": UserPreferencesService.DEFAULT_CURRENCY,
                "country": UserPreferencesService.DEFAULT_COUNTRY
            }

    @staticmethod
    async def update_user_preferences(
            user_id: str,
            preferences: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Update a user's preferences

        Args:
            user_id: The user's ID
            preferences: Dictionary containing language, currency, and/or country preferences

        Returns:
            Dictionary with success status and updated preferences
        """
        try:
            supabase = get_supabase_client()

            # Prepare data for update
            update_data = {}

            if "language" in preferences:
                update_data["language_preference"] = preferences["language"]

            if "currency" in preferences:
                update_data["currency_preference"] = preferences["currency"]

            if "country" in preferences:
                update_data["country_preference"] = preferences["country"]

            # Add updated_at timestamp
            update_data["updated_at"] = "now()"

            # Update the profile
            response = supabase.table("profiles").update(
                update_data
            ).eq("id", user_id).execute()

            if response.error:
                logger.error(f"Error updating user preferences: {response.error.message}")
                return {
                    "success": False,
                    "message": f"Failed to update preferences: {response.error.message}"
                }

            # Get the updated preferences
            updated_preferences = await UserPreferencesService.get_user_preferences(user_id)

            return {
                "success": True,
                "message": "Preferences updated successfully",
                "preferences": updated_preferences
            }

        except Exception as e:
            logger.error(f"Error in update_user_preferences: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to update preferences: {str(e)}"
            }