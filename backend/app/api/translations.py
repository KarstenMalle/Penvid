# File: backend/app/api/translations.py

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, List
from ..database import get_supabase_client
from ..models import Locale
from ..utils.api_util import handle_exceptions, standardize_response
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["translations"])

@router.get("/translations/{locale}")
@handle_exceptions
async def get_translations(locale: Locale):
    """
    Get all translations for a specific locale from the database
    """
    supabase = get_supabase_client()

    # First check if the locale exists
    locale_check = supabase.table("locales").select("*").eq("code", locale).execute()

    if locale_check.error:
        logger.error(f"Error checking locale: {locale_check.error.message}")
        raise HTTPException(status_code=500, detail="Database error")

    if not locale_check.data:
        # Fallback to English if locale doesn't exist
        locale = "en"
        logger.warning(f"Locale {locale} not found, falling back to 'en'")

    # Get all translations for this locale
    translations = supabase.table("translations").select("key, value").eq("locale", locale).execute()

    if translations.error:
        logger.error(f"Error getting translations: {translations.error.message}")
        raise HTTPException(status_code=500, detail="Database error")

    # Convert flat list to nested dictionary
    nested_translations = {}
    for item in translations.data:
        keys = item["key"].split(".")
        current = nested_translations

        for i, key in enumerate(keys):
            if i == len(keys) - 1:
                # Last key, set the value
                current[key] = item["value"]
            else:
                # Create nested dict if it doesn't exist
                if key not in current:
                    current[key] = {}
                current = current[key]

    return standardize_response(
        data={"locale": locale, "translations": nested_translations},
        message="Translations retrieved successfully"
    )

@router.get("/translations/available")
@handle_exceptions
async def get_available_locales():
    """
    Get list of available locales from the database
    """
    supabase = get_supabase_client()

    locales = supabase.table("locales").select("*").eq("is_active", True).execute()

    if locales.error:
        logger.error(f"Error getting locales: {locales.error.message}")
        raise HTTPException(status_code=500, detail="Database error")

    return standardize_response(
        data={"locales": locales.data},
        message="Available locales retrieved successfully"
    )

@router.get("/translations/{locale}/{key}")
@handle_exceptions
async def get_translation(locale: Locale, key: str, default: Optional[str] = None):
    """
    Get a specific translation by key from the database
    """
    supabase = get_supabase_client()

    # Check if the locale exists
    locale_check = supabase.table("locales").select("*").eq("code", locale).execute()

    if locale_check.error:
        logger.error(f"Error checking locale: {locale_check.error.message}")
        raise HTTPException(status_code=500, detail="Database error")

    if not locale_check.data:
        # Fallback to English if locale doesn't exist
        locale = "en"

    # Get the specific translation
    translation = supabase.table("translations").select("value").eq("locale", locale).eq("key", key).single().execute()

    if translation.error or not translation.data:
        # Try the English version if not found
        if locale != "en":
            en_translation = supabase.table("translations").select("value").eq("locale", "en").eq("key", key).single().execute()
            if not en_translation.error and en_translation.data:
                value = en_translation.data["value"]
            else:
                value = default or key
        else:
            value = default or key
    else:
        value = translation.data["value"]

    return standardize_response(
        data={"locale": locale, "key": key, "translation": value},
        message="Translation retrieved successfully"
    )