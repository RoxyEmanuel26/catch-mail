"""
RoxyMail — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
import os

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import connect_db, close_db, get_db
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
    try:
        await redis.close()
    except Exception:
        pass
    await close_db()
    print("👋 RoxyMail API stopped")


ENV = os.getenv("ENV", "development")

app = FastAPI(
    title="RoxyMail API",
    description="Personal disposable email service — roxystore.my.id",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if ENV == "production" else "/docs",
    redoc_url=None if ENV == "production" else "/redoc",
    openapi_url=None if ENV == "production" else "/openapi.json",
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS (M2)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["Content-Type", "Authorization", "X-Webhook-Secret", "X-Requested-With"],
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
@app.head("/health", tags=["health"])
async def health():
    """Verify backend health, checking database and redis connections (L10)."""
    # 1. Check MongoDB Connection
    try:
        db = get_db()
        await db.command("ping")
    except Exception as e:
        raise HTTPException(
            status_code=503, detail=f"Database connection offline: {str(e)}"
        )

    # 2. Check Redis Connection
    try:
        if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
            await redis.ttl("health_check_ping")
    except Exception as e:
        raise HTTPException(
            status_code=503, detail=f"Redis connection offline: {str(e)}"
        )

    return {"status": "ok"}


# Mount routers
app.include_router(auth.router)
app.include_router(inbox.router)
app.include_router(webhook.router)
