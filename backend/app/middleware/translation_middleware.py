from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

class TranslationMiddleware(BaseHTTPMiddleware):
    """Middleware to handle language preferences and translations"""
    
    async def dispatch(self, request: Request, call_next):
        # Get language preference from headers or default to 'en'
        accept_language = request.headers.get("Accept-Language", "en")
        preferred_language = accept_language.split(",")[0].split("-")[0]
        
        # Add language to request state for use in endpoints
        request.state.language = preferred_language
        
        # Process request
        response = await call_next(request)
        return response 