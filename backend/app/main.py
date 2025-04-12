import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from dotenv import load_dotenv
import logging
import sys

from app.middleware import (
    ErrorHandlingMiddleware,
    LoggingMiddleware,
    RateLimitingMiddleware,
    SecurityHeadersMiddleware,
    TranslationMiddleware,
    CurrencyMiddleware
)
from app.api.routers import (
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
from app.utils.api_util import standardize_response

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("penvid_api")
logger.info("Starting Penvid Financial API")

# Get allowed origins from environment variable
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "http://localhost:3000").split(",")

# Initialize FastAPI app
app = FastAPI(
    title="Penvid Financial API",
    description="API for financial calculations and management",
    version="1.0.0"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add currency conversion middleware
app.add_middleware(
    CurrencyMiddleware,
    default_currency="USD",
    excluded_patterns=[
        r"^/api/translations.*",
        r"^/api/health$",
        r"^/api/debug.*",
        r"^/docs.*",
        r"^/openapi.json$"
    ]
)

# Add middleware
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TranslationMiddleware)

# Include routers
app.include_router(loans_router)
app.include_router(loan_calculations_router)
app.include_router(tax_savings_router)
app.include_router(debug_router)
app.include_router(health_router)
app.include_router(translations_router)
app.include_router(financial_strategy_router)
app.include_router(investments_router)
app.include_router(recommendations_router)
app.include_router(financial_calculations_router)
app.include_router(currency_router)
app.include_router(user_settings_router)

@app.get("/api/docs", tags=["documentation"])
async def get_documentation():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Penvid API Documentation",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css",
    )

@app.get("/openapi.json", tags=["documentation"])
async def get_openapi_schema():
    openapi_schema = get_openapi(
        title="Penvid Financial API",
        version="1.0.0",
        description="Backend API for financial calculations and wealth optimization",
        routes=app.routes,
    )
    return openapi_schema

@app.get("/")
async def root(request: Request):
    """Root endpoint that returns API information"""
    return {
        "name": "Penvid Financial API",
        "version": "1.0.0",
        "status": "healthy"
    }

# Run the app if executed directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)