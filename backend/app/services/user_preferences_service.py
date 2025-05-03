# backend/app/services/user_preferences_service.py
from typing import Dict, Any, Optional
import logging
from ..database import get_supabase_client

# Set up logging
logger = logging.getLogger(__name__)

class UserPreferencesService:
    """
    Service for managing user preferences directly from the profiles table
    """

    DEFAULT_LANGUAGE = "en"
    DEFAULT_CURRENCY = "USD"
    DEFAULT_COUNTRY = "US"
    DEFAULT_THEME = "light"

    @staticmethod
    async def get_user_preferences(user_id: str) -> Dict[str, Any]:
        """
        Get a user's preferences from profiles table

        Args:
            user_id: The user's ID

        Returns:
            Dictionary with language, currency, country and theme preferences
        """
        if not user_id:
            logger.error("No user_id provided to get_user_preferences")
            return {
                "language": UserPreferencesService.DEFAULT_LANGUAGE,
                "currency": UserPreferencesService.DEFAULT_CURRENCY,
                "country": UserPreferencesService.DEFAULT_COUNTRY,
                "theme": UserPreferencesService.DEFAULT_THEME
            }

        try:
            supabase = get_supabase_client()
            logger.info(f"Getting preferences for user {user_id}")

            # Query directly from the profiles table
            response = supabase.table("profiles").select(
                "language_preference, currency_preference, country_preference, theme_preference"
            ).eq("id", user_id).execute()

            if response.error:
                logger.error(f"Error fetching user preferences: {response.error.message}")
                return {
                    "language": UserPreferencesService.DEFAULT_LANGUAGE,
                    "currency": UserPreferencesService.DEFAULT_CURRENCY,
                    "country": UserPreferencesService.DEFAULT_COUNTRY,
                    "theme": UserPreferencesService.DEFAULT_THEME
                }

            if not response.data:
                logger.warning(f"No profile found for user {user_id}, creating a new profile")

                # Create default profile for user
                default_profile = {
                    "id": user_id,
                    "language_preference": UserPreferencesService.DEFAULT_LANGUAGE,
                    "currency_preference": UserPreferencesService.DEFAULT_CURRENCY,
                    "country_preference": UserPreferencesService.DEFAULT_COUNTRY,
                    "theme_preference": UserPreferencesService.DEFAULT_THEME,
                    "created_at": "now()",
                    "updated_at": "now()"
                }

                create_response = supabase.table("profiles").insert(default_profile).execute()

                if create_response.error:
                    logger.error(f"Error creating default profile: {create_response.error.message}")
                    return {
                        "language": UserPreferencesService.DEFAULT_LANGUAGE,
                        "currency": UserPreferencesService.DEFAULT_CURRENCY,
                        "country": UserPreferencesService.DEFAULT_COUNTRY,
                        "theme": UserPreferencesService.DEFAULT_THEME
                    }

                logger.info(f"Created default profile for user {user_id}")
                return {
                    "language": UserPreferencesService.DEFAULT_LANGUAGE,
                    "currency": UserPreferencesService.DEFAULT_CURRENCY,
                    "country": UserPreferencesService.DEFAULT_COUNTRY,
                    "theme": UserPreferencesService.DEFAULT_THEME
                }

            user_data = response.data[0]
            logger.info(f"Found preferences for user {user_id}: {user_data}")

            # Return user preferences, falling back to defaults if not set
            return {
                "language": user_data.get("language_preference") or UserPreferencesService.DEFAULT_LANGUAGE,
                "currency": user_data.get("currency_preference") or UserPreferencesService.DEFAULT_CURRENCY,
                "country": user_data.get("country_preference") or UserPreferencesService.DEFAULT_COUNTRY,
                "theme": user_data.get("theme_preference") or UserPreferencesService.DEFAULT_THEME
            }

        except Exception as e:
            logger.exception(f"Error in get_user_preferences: {str(e)}")
            return {
                "language": UserPreferencesService.DEFAULT_LANGUAGE,
                "currency": UserPreferencesService.DEFAULT_CURRENCY,
                "country": UserPreferencesService.DEFAULT_COUNTRY,
                "theme": UserPreferencesService.DEFAULT_THEME
            }

    @staticmethod
    async def update_user_preferences(
            user_id: str,
            preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a user's preferences in the profiles table

        Args:
            user_id: The user's ID
            preferences: Dictionary containing language, currency, country, and/or theme preferences

        Returns:
            Dictionary with success status and updated preferences
        """
        if not user_id:
            logger.error("No user_id provided to update_user_preferences")
            return {
                "success": False,
                "message": "User ID is required to update preferences"
            }

        try:
            supabase = get_supabase_client()
            logger.info(f"Updating preferences for user {user_id}: {preferences}")

            # Prepare data for update
            update_data = {}

            if "language" in preferences and preferences["language"]:
                update_data["language_preference"] = preferences["language"]

            if "currency" in preferences and preferences["currency"]:
                update_data["currency_preference"] = preferences["currency"]

            if "country" in preferences and preferences["country"]:
                update_data["country_preference"] = preferences["country"]

            if "theme" in preferences and preferences["theme"]:
                update_data["theme_preference"] = preferences["theme"]

            # If no valid fields to update, return early
            if not update_data:
                logger.warning(f"No valid preferences to update for user {user_id}")
                return {
                    "success": False,
                    "message": "No valid preferences provided for update"
                }

            # Add updated_at timestamp
            update_data["updated_at"] = "now()"

            # First check if profile exists
            profile_check = supabase.table("profiles").select("id").eq("id", user_id).execute()

            if profile_check.error:
                logger.error(f"Error checking if profile exists: {profile_check.error.message}")
                return {
                    "success": False,
                    "message": f"Failed to check if profile exists: {profile_check.error.message}"
                }

            if not profile_check.data:
                logger.info(f"Profile not found for user {user_id}, creating a new profile with preferences")
                # Create new profile with preferences
                profile_data = {
                    "id": user_id,
                    "language_preference": preferences.get("language", UserPreferencesService.DEFAULT_LANGUAGE),
                    "currency_preference": preferences.get("currency", UserPreferencesService.DEFAULT_CURRENCY),
                    "country_preference": preferences.get("country", UserPreferencesService.DEFAULT_COUNTRY),
                    "theme_preference": preferences.get("theme", UserPreferencesService.DEFAULT_THEME),
                    "created_at": "now()",
                    "updated_at": "now()"
                }

                insert_response = supabase.table("profiles").insert(profile_data).execute()

                if insert_response.error:
                    logger.error(f"Error creating profile: {insert_response.error.message}")
                    return {
                        "success": False,
                        "message": f"Failed to create profile: {insert_response.error.message}"
                    }

                logger.info(f"Created new profile for user {user_id}")
                return {
                    "success": True,
                    "message": "Profile created with preferences",
                    "preferences": {
                        "language": profile_data.get("language_preference"),
                        "currency": profile_data.get("currency_preference"),
                        "country": profile_data.get("country_preference"),
                        "theme": profile_data.get("theme_preference")
                    }
                }

            # Update existing profile
            logger.info(f"Updating existing profile for user {user_id} with data: {update_data}")
            response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()

            if response.error:
                logger.error(f"Error updating user preferences: {response.error.message}")
                return {
                    "success": False,
                    "message": f"Failed to update preferences: {response.error.message}"
                }

            # Get the updated preferences
            updated_preferences = await UserPreferencesService.get_user_preferences(user_id)
            logger.info(f"Preferences updated successfully for user {user_id}")

            return {
                "success": True,
                "message": "Preferences updated successfully",
                "preferences": updated_preferences
            }

        except Exception as e:
            logger.exception(f"Error in update_user_preferences: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to update preferences: {str(e)}"
            }