# File: backend/app/main.py

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

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
)

# Include all API routers
app.include_router(profiles)
app.include_router(preferences)
app.include_router(currency)
app.include_router(loans)
app.include_router(loan_calculations)
app.include_router(translations)

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify API is running
    """
    return {"status": "ok", "message": "Penvid Financial API is running"}

# Run the app if executed directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)