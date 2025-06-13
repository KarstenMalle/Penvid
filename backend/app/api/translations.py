from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, List
from ..database import get_supabase_client
from ..models import Locale
from ..utils.api_util import handle_exceptions, standardize_response
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["translations"])

# Default translations if database is empty
DEFAULT_TRANSLATIONS = {
    "en": {
        "common": {
            "loading": "Loading...",
            "error": "Error",
            "save": "Save",
            "cancel": "Cancel",
            "delete": "Delete",
            "edit": "Edit",
            "add": "Add",
            "search": "Search",
            "filter": "Filter",
            "export": "Export",
            "import": "Import",
        },
        "auth": {
            "login": "Login",
            "logout": "Logout",
            "register": "Register",
            "email": "Email",
            "password": "Password",
        },
        "loans": {
            "title": "Loans",
            "addLoan": "Add Loan",
            "noLoans": "No loans found",
            "loanName": "Loan Name",
            "balance": "Balance",
            "interestRate": "Interest Rate",
            "minimumPayment": "Minimum Payment",
            "loanType": "Loan Type",
            "termYears": "Term (Years)",
            "failedToLoadLoan": "Failed to load loan",
            "failedToUpdateLoan": "Failed to update loan",
            "failedToDeleteLoan": "Failed to delete loan",
            "loanUpdatedSuccessfully": "Loan updated successfully",
            "loanDeletedSuccessfully": "Loan deleted successfully",
        },
        "profile": {
            "title": "Profile",
            "name": "Name",
            "email": "Email",
            "phone": "Phone",
            "failedToLoadProfile": "Failed to load profile",
            "failedToUpdate": "Failed to update profile",
            "updatedSuccessfully": "Profile updated successfully",
            "mustBeLoggedIn": "You must be logged in",
        }
    },
    "da": {
        "common": {
            "loading": "Indlæser...",
            "error": "Fejl",
            "save": "Gem",
            "cancel": "Annuller",
            "delete": "Slet",
            "edit": "Rediger",
            "add": "Tilføj",
            "search": "Søg",
            "filter": "Filtrer",
            "export": "Eksporter",
            "import": "Importer",
        },
        "auth": {
            "login": "Log ind",
            "logout": "Log ud",
            "register": "Registrer",
            "email": "Email",
            "password": "Adgangskode",
        },
        "loans": {
            "title": "Lån",
            "addLoan": "Tilføj lån",
            "noLoans": "Ingen lån fundet",
            "loanName": "Lånenavn",
            "balance": "Saldo",
            "interestRate": "Rentesats",
            "minimumPayment": "Minimumsbetaling",
            "loanType": "Lånetype",
            "termYears": "Løbetid (år)",
            "failedToLoadLoan": "Kunne ikke indlæse lån",
            "failedToUpdateLoan": "Kunne ikke opdatere lån",
            "failedToDeleteLoan": "Kunne ikke slette lån",
            "loanUpdatedSuccessfully": "Lån opdateret succesfuldt",
            "loanDeletedSuccessfully": "Lån slettet succesfuldt",
        },
        "profile": {
            "title": "Profil",
            "name": "Navn",
            "email": "Email",
            "phone": "Telefon",
            "failedToLoadProfile": "Kunne ikke indlæse profil",
            "failedToUpdate": "Kunne ikke opdatere profil",
            "updatedSuccessfully": "Profil opdateret succesfuldt",
            "mustBeLoggedIn": "Du skal være logget ind",
        }
    }
}

# Default locales if database is empty
DEFAULT_LOCALES = [
    {
        "code": "en",
        "name": "English",
        "native_name": "English",
        "flag": "🇺🇸",
        "is_active": True
    },
    {
        "code": "da",
        "name": "Danish",
        "native_name": "Dansk",
        "flag": "🇩🇰",
        "is_active": True
    }
]

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
        # Return default translations instead of failing
        return standardize_response(
            data={"locale": locale, "translations": DEFAULT_TRANSLATIONS.get(locale, DEFAULT_TRANSLATIONS["en"])},
            message="Using default translations due to database error"
        )

    if not locale_check.data:
        # Fallback to English if locale doesn't exist
        locale = "en"
        logger.warning(f"Locale {locale} not found, falling back to 'en'")

    # Get all translations for this locale
    translations = supabase.table("translations").select("key, value").eq("locale", locale).execute()

    if translations.error:
        logger.error(f"Error getting translations: {translations.error.message}")
        # Return default translations instead of failing
        return standardize_response(
            data={"locale": locale, "translations": DEFAULT_TRANSLATIONS.get(locale, DEFAULT_TRANSLATIONS["en"])},
            message="Using default translations due to database error"
        )

    # If no translations found, return defaults
    if not translations.data:
        return standardize_response(
            data={"locale": locale, "translations": DEFAULT_TRANSLATIONS.get(locale, DEFAULT_TRANSLATIONS["en"])},
            message="Using default translations"
        )

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
        # Return default locales instead of failing
        return standardize_response(
            data={"locales": DEFAULT_LOCALES},
            message="Using default locales due to database error"
        )

    # If no locales found, return defaults
    if not locales.data:
        return standardize_response(
            data={"locales": DEFAULT_LOCALES},
            message="Using default locales"
        )

    return standardize_response(
        data={"locales": locales.data},
        message="Available locales retrieved successfully"
    )