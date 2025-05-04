# backend/app/api/__init__.py

# Import all API modules here to make them available when importing from app.api
from ..api.loans import router as loans_router
from ..api.currency import router as currency_router
from ..api.loan_calculations import router as loan_calculations_router
from ..api.profiles import router as profiles_router
from ..api.preferences import router as preferences_router
from ..api.translations import router as translations_router

# Export the routers
loans = loans_router
currency = currency_router
loan_calculations = loan_calculations_router
profiles = profiles_router
preferences = preferences_router
translations = translations_router