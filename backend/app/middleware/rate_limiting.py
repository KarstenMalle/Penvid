from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class RateLimitingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, time_window: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = {}

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        current_time = time.time()

        # Clean up old entries
        self.requests = {
            ip: (count, timestamp)
            for ip, (count, timestamp) in self.requests.items()
            if current_time - timestamp < self.time_window
        }

        # Get or initialize request count for this IP
        count, timestamp = self.requests.get(client_ip, (0, current_time))

        # Check if rate limit exceeded
        if count >= self.max_requests:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )

        # Update request count
        self.requests[client_ip] = (count + 1, current_time)

        # Process request
        response = await call_next(request)
        return response 