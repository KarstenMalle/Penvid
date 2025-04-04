from fastapi import APIRouter, HTTPException, Query, Request
from typing import Dict, Any, Optional
import json
import os
from pathlib import Path
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["translations"])

# Load translation files
TRANSLATIONS_DIR = Path(__file__).parent.parent.parent / "translations"

def load_translations():
    """Load all available translation files"""
    translations = {}

    if not TRANSLATIONS_DIR.exists():
        os.makedirs(TRANSLATIONS_DIR, exist_ok=True)
        logger.info(f"Created translations directory at {TRANSLATIONS_DIR}")

    # Create default translations if none exist
    if not list(TRANSLATIONS_DIR.glob("*.json")):
        logger.info("No translation files found, creating defaults")
        create_default_translations()

    for file_path in TRANSLATIONS_DIR.glob("*.json"):
        locale = file_path.stem
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                translations[locale] = json.load(f)
                logger.info(f"Loaded translations for locale {locale}")
        except Exception as e:
            logger.error(f"Error loading translation file {file_path}: {e}")
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
            "edit": "Edit",
            "previous": "Previous",
            "next": "Next",
            "pageXOfY": "Page {current} of {total}",
            "notAvailable": "Not available",
            "backToLoans": "Back to Loans",
            "calculating": "Calculating..."
        },
        "auth": {
            "login": "Login",
            "register": "Register",
            "email": "Email",
            "password": "Password"
        },
        "loans": {
            "title": "Loans",
            "overview": "Overview",
            "amortizationSchedule": "Amortization Schedule",
            "paymentAnalysis": "Payment Analysis",
            "balance": "Balance",
            "interestRate": "Interest Rate",
            "monthlyPayment": "Monthly Payment",
            "term": "Term",
            "years": "years",
            "totalInterest": "Total Interest",
            "estimatedPayoffDate": "Estimated Payoff Date",
            "keyMetrics": "Key Metrics",
            "importantFinancialMetrics": "Important financial metrics",
            "totalCost": "Total Cost",
            "interestToPrincipalRatio": "Interest to Principal Ratio",
            "monthsRemaining": "Months Remaining",
            "monthlyInterest": "Monthly Interest",
            "balanceOverTime": "Balance Over Time",
            "paymentBreakdown": "Payment Breakdown",
            "interestAnalysis": "Interest Analysis",
            "totalPaymentBreakdown": "Total Payment Breakdown",
            "principalVsInterest": "Principal vs Interest",
            "totalPrincipal": "Total Principal",
            "principal": "Principal",
            "interest": "Interest",
            "filterByYear": "Filter by Year",
            "extraMonthlyPayment": "Extra Monthly Payment",
            "selectYear": "Select Year",
            "allYears": "All Years",
            "yearNumber": "Year {year}",
            "downloadCSV": "Download CSV",
            "totalPayments": "Total Payments",
            "principalAmount": "Principal Amount",
            "paymentNumber": "Payment Number",
            "date": "Date",
            "payment": "Payment",
            "remainingBalance": "Remaining Balance",
            "noPaymentsToDisplay": "No payments to display",
            "showingPayments": "Showing {start}-{end} of {total} payments",
            "month": "Month",
            "types": {
                "mortgage": "Mortgage",
                "mortgage_bond": "Mortgage Bond",
                "home_loan": "Home Loan",
                "student": "Student Loan",
                "auto": "Auto Loan",
                "credit_card": "Credit Card",
                "personal": "Personal Loan",
                "other": "Other Loan"
            },
            "taxInfo": {
                "title": "Tax Optimization",
                "description": "Tax insights and optimization strategies for your loan",
                "loading": "Loading tax information...",
                "loginPrompt": "Log in to see tax optimization tips",
                "loginRequired": "You need to be logged in to view tax optimization information.",
                "taxStatusFor": "Tax Status for",
                "annualInterest": "Annual Interest",
                "deductibility": "Deductibility",
                "taxDeductible": "Tax Deductible",
                "notDeductible": "Not Deductible",
                "deductionRate": "Deduction Rate",
                "annualSavings": "Annual Savings",
                "deductionCap": "Deduction Cap",
                "countrySpecificRules": "Country-Specific Tax Rules",
                "optimizationTips": "Tax Optimization Tips",
                "optimizationDescription": "Maximize your savings with these tax strategies:",
                "disclaimer": "Always consult a tax professional for advice specific to your situation.",
                "dataSourceNote": "Tax information last updated",
                "updatedRegularly": "Updated regularly"
            }
        }
    }

    # Create Danish translations
    default_da = {
        "common": {
            "appName": "Penvid",
            "save": "Gem",
            "cancel": "Annuller",
            "loading": "Indlæser...",
            "submit": "Indsend",
            "delete": "Slet",
            "edit": "Rediger",
            "previous": "Forrige",
            "next": "Næste",
            "pageXOfY": "Side {current} af {total}",
            "notAvailable": "Ikke tilgængelig",
            "backToLoans": "Tilbage til lån",
            "calculating": "Beregner..."
        },
        "auth": {
            "login": "Log ind",
            "register": "Registrer",
            "email": "Email",
            "password": "Adgangskode"
        },
        "loans": {
            "title": "Lån",
            "overview": "Oversigt",
            "amortizationSchedule": "Afdragsplan",
            "paymentAnalysis": "Betalingsanalyse",
            "balance": "Saldo",
            "interestRate": "Rentesats",
            "monthlyPayment": "Månedlig ydelse",
            "term": "Løbetid",
            "years": "år",
            "totalInterest": "Samlede renter",
            "estimatedPayoffDate": "Estimeret tilbagebetalingsdato",
            "keyMetrics": "Nøgletal",
            "importantFinancialMetrics": "Vigtige økonomiske nøgletal",
            "totalCost": "Samlet omkostning",
            "interestToPrincipalRatio": "Renter i forhold til hovedstol",
            "monthsRemaining": "Resterende måneder",
            "monthlyInterest": "Månedlig rente",
            "balanceOverTime": "Saldo over tid",
            "paymentBreakdown": "Betalingsoversigt",
            "interestAnalysis": "Renteanalyse",
            "totalPaymentBreakdown": "Samlet betalingsoversigt",
            "principalVsInterest": "Hovedstol vs. renter",
            "totalPrincipal": "Samlet hovedstol",
            "principal": "Hovedstol",
            "interest": "Renter",
            "filterByYear": "Filtrer efter år",
            "extraMonthlyPayment": "Ekstra månedlig betaling",
            "selectYear": "Vælg år",
            "allYears": "Alle år",
            "yearNumber": "År {year}",
            "downloadCSV": "Download CSV",
            "totalPayments": "Samlede betalinger",
            "principalAmount": "Hovedstolsbeløb",
            "paymentNumber": "Betalingsnummer",
            "date": "Dato",
            "payment": "Betaling",
            "remainingBalance": "Resterende saldo",
            "noPaymentsToDisplay": "Ingen betalinger at vise",
            "showingPayments": "Viser {start}-{end} af {total} betalinger",
            "month": "Måned",
            "types": {
                "mortgage": "Realkreditlån",
                "mortgage_bond": "Obligationslån",
                "home_loan": "Boliglån",
                "student": "SU-lån",
                "auto": "Billån",
                "credit_card": "Kreditkort",
                "personal": "Forbrugslån",
                "other": "Andet lån"
            },
            "taxInfo": {
                "title": "Skatteoptimering",
                "description": "Skatteindsigter og optimeringsstrategier for dit lån",
                "loading": "Indlæser skatteoplysninger...",
                "loginPrompt": "Log ind for at se skatteoptimering",
                "loginRequired": "Du skal være logget ind for at se skatteoptimering.",
                "taxStatusFor": "Skattestatus for",
                "annualInterest": "Årlig rente",
                "deductibility": "Fradragsberettigelse",
                "taxDeductible": "Fradragsberettiget",
                "notDeductible": "Ikke fradragsberettiget",
                "deductionRate": "Fradragssats",
                "annualSavings": "Årlig besparelse",
                "deductionCap": "Fradragsloft",
                "countrySpecificRules": "Landespecifikke skatteregler",
                "optimizationTips": "Skatteoptimering tips",
                "optimizationDescription": "Maksimer dine besparelser med disse skattestrategier:",
                "disclaimer": "Konsulter altid en skatterådgiver for råd specifikt til din situation.",
                "dataSourceNote": "Skatteoplysninger sidst opdateret",
                "updatedRegularly": "Opdateres regelmæssigt"
            }
        }
    }

    en_path = TRANSLATIONS_DIR / "en.json"
    da_path = TRANSLATIONS_DIR / "da.json"
    os.makedirs(TRANSLATIONS_DIR, exist_ok=True)

    with open(en_path, "w", encoding="utf-8") as f:
        json.dump(default_en, f, indent=2, ensure_ascii=False)
        logger.info(f"Created default English translations at {en_path}")

    with open(da_path, "w", encoding="utf-8") as f:
        json.dump(default_da, f, indent=2, ensure_ascii=False)
        logger.info(f"Created default Danish translations at {da_path}")

# Initialize translations
TRANSLATIONS = load_translations()
AVAILABLE_LOCALES = list(TRANSLATIONS.keys())

@router.get("/translations")
async def get_available_translations():
    """Get list of available translation locales"""
    logger.info(f"Requested available locales: {AVAILABLE_LOCALES}")
    return {"available_locales": AVAILABLE_LOCALES}

@router.get("/translations/{locale}")
async def get_translations(locale: str, namespace: Optional[str] = Query(None), request: Request = None):
    """
    Get translations for a specific locale, optionally filtered by namespace

    Args:
        locale: The locale code (e.g., 'en', 'da')
        namespace: Optional namespace to filter translations (e.g., 'common', 'auth')
        request: FastAPI request object for logging

    Returns:
        Dictionary of translations
    """
    client_ip = request.client.host if request else "unknown"
    locale = locale.lower()  # Normalize locale to lowercase

    logger.info(f"Translations requested for locale '{locale}' from {client_ip}")

    # Reload translations to ensure we have the latest version
    global TRANSLATIONS
    TRANSLATIONS = load_translations()

    if locale not in TRANSLATIONS:
        logger.warning(f"Translations for locale '{locale}' not found, available: {AVAILABLE_LOCALES}")
        raise HTTPException(status_code=404, detail=f"Translations for locale '{locale}' not found")

    # If loan translations are missing, add them from defaults
    if 'loans' not in TRANSLATIONS[locale] and locale in ['en', 'da']:
        logger.warning(f"Loan translations missing for {locale}, recreating defaults")
        create_default_translations()
        TRANSLATIONS = load_translations()

    if namespace:
        if namespace in TRANSLATIONS[locale]:
            logger.info(f"Returning namespace '{namespace}' for locale '{locale}'")
            return {namespace: TRANSLATIONS[locale][namespace]}
        else:
            logger.warning(f"Namespace '{namespace}' not found in locale '{locale}'")
            raise HTTPException(status_code=404, detail=f"Namespace '{namespace}' not found in locale '{locale}'")

    # Log the size of the translations being returned
    namespaces = TRANSLATIONS[locale].keys()
    logger.info(f"Returning full translations for locale '{locale}', namespaces: {namespaces}")

    return TRANSLATIONS[locale]

@router.post("/translations/{locale}")
async def update_translations(locale: str, translations: Dict[str, Any], request: Request = None):
    """
    Update translations for a specific locale
    Admin-only endpoint (requires auth in production)
    """
    client_ip = request.client.host if request else "unknown"
    locale = locale.lower()  # Normalize locale to lowercase

    logger.info(f"Update translations requested for locale '{locale}' from {client_ip}")

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
        global TRANSLATIONS, AVAILABLE_LOCALES
        TRANSLATIONS[locale] = updated_translations
        if locale not in AVAILABLE_LOCALES:
            AVAILABLE_LOCALES.append(locale)

        logger.info(f"Translations for locale '{locale}' updated successfully")
        return {"success": True, "message": f"Translations for locale '{locale}' updated successfully"}

    except Exception as e:
        logger.error(f"Error updating translations for locale '{locale}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating translations: {str(e)}")