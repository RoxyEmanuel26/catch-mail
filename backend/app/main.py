"""
RoxyMail — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import connect_db, close_db
from app.redis_client import redis
from app.middleware.rate_limiter import limiter
from app.routers import auth, inbox, webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    await connect_db()
    print(f"🚀 RoxyMail API started — domain: {settings.DOMAIN}")
    yield
    # Shutdown
    await redis.close()
    await close_db()
    print("👋 RoxyMail API stopped")


app = FastAPI(
    title="RoxyMail API",
    description="Personal disposable email service — roxystore.my.id",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/", tags=["health"])
async def root():
    return {
        "service": "RoxyMail API",
        "version": "1.0.0",
        "domain": settings.DOMAIN,
        "status": "running",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


# Mount routers
app.include_router(auth.router)
app.include_router(inbox.router)
app.include_router(webhook.router)
