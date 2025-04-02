import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api import (
    loans,
    investments,
    financial_strategy,
    currency,
    user_settings,
    translations,
    loan_calculations,
    recommendations
)

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
)

# Include all API routers
app.include_router(loans.router)
app.include_router(investments.router)
app.include_router(financial_strategy.router)
app.include_router(currency.router)
app.include_router(user_settings.router)
app.include_router(translations.router)
app.include_router(loan_calculations.router)
app.include_router(recommendations.router)

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify API is running
    """
    return {"status": "ok", "message": "Penvid Financial API is running"}

@app.get("/")
async def root():
    """
    Root endpoint with API information
    """
    return {
        "name": "Penvid Financial API",
        "version": "1.0.0",
        "description": "Backend API for financial calculations and wealth optimization"
    }

# Run the app if executed directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)