# Import all API modules here to make them available when importing from app.api
from ..api.loans import router as loans_router
from ..api.currency import router as currency_router
from ..api.user_settings import router as user_settings_router
from ..api.loan_calculations import router as loan_calculations_router

# Export the routers
loans = loans_router
currency = currency_router
user_settings = user_settings_router
loan_calculations = loan_calculations_router