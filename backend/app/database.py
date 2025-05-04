# File: backend/app/database.py

import os
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Get Supabase connection details
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials in environment variables")
    raise ValueError("Missing Supabase credentials")

# Initialize Supabase client
_supabase: Client = None

def get_supabase_client() -> Client:
    """Returns the initialized Supabase client"""
    global _supabase

    if _supabase is None:
        try:
            _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing Supabase client: {str(e)}")
            raise

    return _supabase