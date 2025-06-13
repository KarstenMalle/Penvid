import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from supabase import create_client, Client
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_supabase_admin_client() -> Client:
    """Get Supabase client with service role key for admin operations"""
    url = os.environ.get("SUPABASE_URL")
    # Use service role key instead of anon key for seeding
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise ValueError(
            "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file\n"
            "The service role key can be found in your Supabase project settings"
        )

    return create_client(url, key)

def seed_locales():
    """Seed the locales table"""
    supabase = get_supabase_admin_client()

    locales = [
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

    for locale in locales:
        # Use upsert to avoid conflicts
        result = supabase.table("locales").upsert(locale, on_conflict="code").execute()
        if hasattr(result, 'error') and result.error:
            print(f"Error inserting locale {locale['code']}: {result.error}")
        else:
            print(f"Successfully seeded locale: {locale['code']}")

def seed_translations():
    """Seed basic translations"""
    supabase = get_supabase_admin_client()

    translations = [
        # English translations
        {"locale": "en", "key": "common.loading", "value": "Loading..."},
        {"locale": "en", "key": "common.error", "value": "Error"},
        {"locale": "en", "key": "common.save", "value": "Save"},
        {"locale": "en", "key": "common.cancel", "value": "Cancel"},
        {"locale": "en", "key": "common.delete", "value": "Delete"},
        {"locale": "en", "key": "common.edit", "value": "Edit"},
        {"locale": "en", "key": "common.add", "value": "Add"},
        {"locale": "en", "key": "loans.title", "value": "Loans"},
        {"locale": "en", "key": "loans.noLoans", "value": "No loans found"},
        {"locale": "en", "key": "loans.noLoansTitle", "value": "No loans yet"},
        {"locale": "en", "key": "loans.noLoansDescription", "value": "Get started by adding your first loan or importing existing loans."},
        {"locale": "en", "key": "loans.addLoan", "value": "Add Loan"},
        {"locale": "en", "key": "loans.addFirstLoan", "value": "Add Your First Loan"},
        {"locale": "en", "key": "loans.importLoans", "value": "Import Loans"},
        {"locale": "en", "key": "loans.balance", "value": "Balance"},
        {"locale": "en", "key": "loans.interestRate", "value": "Interest Rate"},
        {"locale": "en", "key": "loans.minimumPayment", "value": "Minimum Payment"},
        {"locale": "en", "key": "loans.loanType", "value": "Loan Type"},
        {"locale": "en", "key": "loans.termYears", "value": "Term (Years)"},

        # Danish translations
        {"locale": "da", "key": "common.loading", "value": "Indlæser..."},
        {"locale": "da", "key": "common.error", "value": "Fejl"},
        {"locale": "da", "key": "common.save", "value": "Gem"},
        {"locale": "da", "key": "common.cancel", "value": "Annuller"},
        {"locale": "da", "key": "common.delete", "value": "Slet"},
        {"locale": "da", "key": "common.edit", "value": "Rediger"},
        {"locale": "da", "key": "common.add", "value": "Tilføj"},
        {"locale": "da", "key": "loans.title", "value": "Lån"},
        {"locale": "da", "key": "loans.noLoans", "value": "Ingen lån fundet"},
        {"locale": "da", "key": "loans.noLoansTitle", "value": "Ingen lån endnu"},
        {"locale": "da", "key": "loans.noLoansDescription", "value": "Kom i gang ved at tilføje dit første lån eller importere eksisterende lån."},
        {"locale": "da", "key": "loans.addLoan", "value": "Tilføj lån"},
        {"locale": "da", "key": "loans.addFirstLoan", "value": "Tilføj dit første lån"},
        {"locale": "da", "key": "loans.importLoans", "value": "Importer lån"},
        {"locale": "da", "key": "loans.balance", "value": "Saldo"},
        {"locale": "da", "key": "loans.interestRate", "value": "Rentesats"},
        {"locale": "da", "key": "loans.minimumPayment", "value": "Minimumsbetaling"},
        {"locale": "da", "key": "loans.loanType", "value": "Lånetype"},
        {"locale": "da", "key": "loans.termYears", "value": "Løbetid (år)"},
    ]

    # Insert in batches to avoid conflicts
    for translation in translations:
        result = supabase.table("translations").upsert(
            translation,
            on_conflict="locale,key"
        ).execute()
        if hasattr(result, 'error') and result.error:
            print(f"Error inserting translation {translation['key']}: {result.error}")
        else:
            print(f"Successfully seeded translation: {translation['locale']}.{translation['key']}")

def seed_currency_rates():
    """Seed initial currency rates"""
    supabase = get_supabase_admin_client()

    # Sample rates (you should update these with real rates)
    rates = [
        {"base_currency": "USD", "target_currency": "DKK", "rate": 6.89},
        {"base_currency": "USD", "target_currency": "EUR", "rate": 0.92},
        {"base_currency": "DKK", "target_currency": "USD", "rate": 0.145},
        {"base_currency": "DKK", "target_currency": "EUR", "rate": 0.134},
        {"base_currency": "EUR", "target_currency": "USD", "rate": 1.087},
        {"base_currency": "EUR", "target_currency": "DKK", "rate": 7.46},
    ]

    for rate in rates:
        rate["last_updated"] = datetime.utcnow().isoformat()
        result = supabase.table("currency_rates").upsert(
            rate,
            on_conflict="base_currency,target_currency"
        ).execute()
        if hasattr(result, 'error') and result.error:
            print(f"Error inserting rate {rate['base_currency']}->{rate['target_currency']}: {result.error}")
        else:
            print(f"Successfully seeded rate: {rate['base_currency']}->{rate['target_currency']}")

if __name__ == "__main__":
    print("Starting database seeding...")
    print("Make sure you have set SUPABASE_SERVICE_ROLE_KEY in your .env file")
    print("-" * 50)

    try:
        seed_locales()
        print("-" * 50)
        seed_translations()
        print("-" * 50)
        seed_currency_rates()
        print("-" * 50)
        print("Database seeding completed successfully!")
    except Exception as e:
        print(f"Error during seeding: {e}")
        print("\nMake sure you have:")
        print("1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file")
        print("2. Run the RLS policy configuration SQL in your Supabase dashboard")