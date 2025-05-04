# File: backend/migrations/import_translations.py

import os
import json
import logging
from dotenv import load_dotenv
from supabase import create_client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(".env")

# Get Supabase connection details
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env file")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Path to translation files
TRANSLATIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "translations")

def flatten_dict(d, parent_key='', sep='.'):
    """Flatten a nested dictionary into dot notation"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def import_translations():
    """Import translations from JSON files into database"""

    # Load and insert translations for each locale
    translation_files = [f for f in os.listdir(TRANSLATIONS_DIR) if f.endswith('.json')]

    for file_name in translation_files:
        locale = file_name.split('.')[0]
        logger.info(f"Importing translations for locale: {locale}")

        file_path = os.path.join(TRANSLATIONS_DIR, file_name)

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                translations = json.load(f)

            # Flatten nested translations
            flattened = flatten_dict(translations)

            # Prepare for batch insert
            translations_data = []
            for key, value in flattened.items():
                if isinstance(value, str):  # Only import string values
                    translations_data.append({
                        "locale": locale,
                        "key": key,
                        "value": value
                    })

            # Insert in batches of 1000 to avoid payload size limits
            batch_size = 1000
            for i in range(0, len(translations_data), batch_size):
                batch = translations_data[i:i+batch_size]
                result = supabase.table("translations").upsert(batch).execute()
                if hasattr(result, 'error') and result.error:
                    logger.error(f"Error inserting translations: {result.error}")
                else:
                    logger.info(f"Inserted {len(batch)} translations for {locale}")

        except Exception as e:
            logger.error(f"Error processing file {file_name}: {str(e)}")

    logger.info("Translation import completed!")

if __name__ == "__main__":
    try:
        import_translations()
        print("Translation import completed successfully!")
    except Exception as e:
        print(f"Translation import failed: {str(e)}")