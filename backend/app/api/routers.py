from .loans import router as loans_router
from .loan_calculations import router as loan_calculations_router
from .tax_savings import router as tax_savings_router
from .debug import router as debug_router
from .health import router as health_router
from .translations import router as translations_router
from .financial_strategy import router as financial_strategy_router
from .investments import router as investments_router
from .recommendations import router as recommendations_router
from .financial_calculations import router as financial_calculations_router
from .currency import router as currency_router
from .user_settings import router as user_settings_router

# Export all routers
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