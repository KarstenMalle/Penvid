# Import all API modules here to make them available when importing from app.api
from ..api.loans import router as loans_router
from ..api.investments import router as investments_router
from ..api.financial_strategy import router as financial_strategy_router
from ..api.currency import router as currency_router
from ..api.user_settings import router as user_settings_router
from ..api.translations import router as translations_router
from ..api.loan_calculations import router as loan_calculations_router
from ..api.recommendations import router as recommendations_router
from ..api.tax_savings import router as tax_savings_router
from ..api.debug import router as debug_router

# Export the routers
loans = loans_router
investments = investments_router
financial_strategy = financial_strategy_router
currency = currency_router
user_settings = user_settings_router
translations = translations_router
loan_calculations = loan_calculations_router
recommendations = recommendations_router
tax_savings = tax_savings_router
debug = debug_router