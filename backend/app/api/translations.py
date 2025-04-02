from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
import json
import os
from pathlib import Path

router = APIRouter(prefix="/api", tags=["translations"])

# Load translation files
TRANSLATIONS_DIR = Path(__file__).parent.parent.parent / "translations"

def load_translations():
    """Load all available translation files"""
    translations = {}

    if not TRANSLATIONS_DIR.exists():
        os.makedirs(TRANSLATIONS_DIR, exist_ok=True)

    # Create default translations if none exist
    if not list(TRANSLATIONS_DIR.glob("*.json")):
        create_default_translations()

    for file_path in TRANSLATIONS_DIR.glob("*.json"):
        locale = file_path.stem
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                translations[locale] = json.load(f)
        except Exception as e:
            print(f"Error loading translation file {file_path}: {e}")
            translations[locale] = {}

    return translations

def create_default_translations():
    """Create default English translation file if none exists"""
    default_en = {
        "common": {
            "appName": "Penvid",
            "save": "Save",
            "cancel": "Cancel",
            "loading": "Loading...",
            "submit": "Submit",
            "delete": "Delete",
            "edit": "Edit"
        },
        "auth": {
            "login": "Login",
            "register": "Register",
            "email": "Email",
            "password": "Password"
        }
    }

    en_path = TRANSLATIONS_DIR / "en.json"
    os.makedirs(TRANSLATIONS_DIR, exist_ok=True)

    with open(en_path, "w", encoding="utf-8") as f:
        json.dump(default_en, f, indent=2, ensure_ascii=False)

# Initialize translations
TRANSLATIONS = load_translations()
AVAILABLE_LOCALES = list(TRANSLATIONS.keys())

@router.get("/translations")
async def get_available_translations():
    """Get list of available translation locales"""
    return {"available_locales": AVAILABLE_LOCALES}

@router.get("/translations/{locale}")
async def get_translations(locale: str, namespace: Optional[str] = Query(None)):
    """
    Get translations for a specific locale, optionally filtered by namespace

    Args:
        locale: The locale code (e.g., 'en', 'da')
        namespace: Optional namespace to filter translations (e.g., 'common', 'auth')

    Returns:
        Dictionary of translations
    """
    if locale not in TRANSLATIONS:
        raise HTTPException(status_code=404, detail=f"Translations for locale '{locale}' not found")

    if namespace:
        if namespace in TRANSLATIONS[locale]:
            return {namespace: TRANSLATIONS[locale][namespace]}
        else:
            raise HTTPException(status_code=404, detail=f"Namespace '{namespace}' not found in locale '{locale}'")

    return TRANSLATIONS[locale]

@router.post("/translations/{locale}")
async def update_translations(locale: str, translations: Dict[str, Any]):
    """
    Update translations for a specific locale
    Admin-only endpoint (requires auth in production)
    """
    # In a real implementation, this would have auth checks

    try:
        file_path = TRANSLATIONS_DIR / f"{locale}.json"

        # If file exists, load existing translations and merge
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                existing = json.load(f)

            # Deep merge the translations
            def deep_merge(target, source):
                for key, value in source.items():
                    if key in target and isinstance(value, dict) and isinstance(target[key], dict):
                        deep_merge(target[key], value)
                    else:
                        target[key] = value

            deep_merge(existing, translations)
            updated_translations = existing
        else:
            updated_translations = translations

        # Write the updated translations
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(updated_translations, f, indent=2, ensure_ascii=False)

        # Reload translations
        TRANSLATIONS[locale] = updated_translations
        if locale not in AVAILABLE_LOCALES:
            AVAILABLE_LOCALES.append(locale)

        return {"success": True, "message": f"Translations for locale '{locale}' updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating translations: {str(e)}")