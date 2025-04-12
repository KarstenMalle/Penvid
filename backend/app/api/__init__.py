# Import all API modules here to make them available when importing from app.api
from .routers import (
    loans_router,
    loan_calculations_router,
    tax_savings_router,
    debug_router,
    health_router,
    translations_router,
    financial_strategy_router,
    investments_router,
    recommendations_router,
    financial_calculations_router,
    currency_router,
    user_settings_router
)

__all__ = [
    "loans_router",
    "loan_calculations_router",
    "tax_savings_router",
    "debug_router",
    "health_router",
    "translations_router",
    "financial_strategy_router",
    "investments_router",
    "recommendations_router",
    "financial_calculations_router",
    "currency_router",
    "user_settings_router"
]