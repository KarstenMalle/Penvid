# File: backend/app/main.py

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

logger = logging.getLogger(__name__)

# Import API modules
from app.api import profiles, preferences, currency, loans, loan_calculations, translations

# Load environment variables
load_dotenv()

# Get allowed origins from environment variable
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "http://localhost:3000").split(",")

# Initialize FastAPI app
app = FastAPI(
    title="Penvid Financial API",
    description="Backend API for Penvid financial calculations and wealth optimizer",
    version="1.0.0"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )

# Include all API routers - FIXED: Remove .router since they're already router objects
app.include_router(profiles)
app.include_router(preferences)
app.include_router(currency)
app.include_router(loans)
app.include_router(loan_calculations)
app.include_router(translations)

@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint to verify API is running
    """
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "Penvid Financial API",
            "version": "1.0.0"
        },
        "message": "API is running"
    }

# Additional endpoints for testing
@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "success": True,
        "message": "Penvid Financial API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api")
async def api_root():
    """
    API root endpoint
    """
    return {
        "success": True,
        "message": "Penvid Financial API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "preferences": "/api/preferences",
            "translations": "/api/translations",
            "loans": "/api/loans",
            "profiles": "/api/profiles",
            "currency": "/api/currency"
        }
    }

# Run the app if executed directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)