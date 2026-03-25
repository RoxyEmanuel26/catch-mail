"""
RoxyMail — Auth Service
Business logic for authentication operations.
"""

from datetime import datetime
import hashlib

from app.database import get_db
from app.redis_client import redis
from app.utils.security import (
    hash_pin,
    verify_pin,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_remaining_seconds,
)
from app.config import settings


LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION = 900  # 15 minutes


async def register_user(username: str, pin: str) -> dict:
    """Register a new user with email and PIN."""
    db = get_db()
    email_addr = f"{username}@{settings.DOMAIN}"

    # Check if email already exists
    existing = await db.users.find_one({"email": email_addr})
    if existing:
        raise ValueError("Email sudah terdaftar")

    user_doc = {
        "_id": str(__import__("uuid").uuid4()),
        "email": email_addr,
        "username": username,
        "domain": settings.DOMAIN,
        "pin_hash": hash_pin(pin),
        "is_active": True,
        "created_at": datetime.utcnow(),
        "expires_at": None,
        "last_login": None,
        "failed_attempts": 0,
    }

    await db.users.insert_one(user_doc)

    return {
        "email": email_addr,
        "username": username,
        "domain": settings.DOMAIN,
        "created_at": user_doc["created_at"],
    }


async def login_user(email_addr: str, pin: str) -> dict:
    """Authenticate user and return tokens."""
    db = get_db()

    # Check Redis lockout
    lockout_key = f"lockout:{email_addr}"
    lockout_count = await redis.get(lockout_key)
    if lockout_count and int(lockout_count) >= LOCKOUT_THRESHOLD:
        ttl = await redis.ttl(lockout_key)
        raise PermissionError(f"Akun terkunci. Coba lagi dalam {ttl or LOCKOUT_DURATION} detik")

    # Find user
    user = await db.users.find_one({"email": email_addr})
    if not user:
        raise ValueError("Email tidak ditemukan")

    # Verify PIN
    if not verify_pin(pin, user["pin_hash"]):
        # Increment failed attempts
        await redis.incr(lockout_key)
        await redis.expire(lockout_key, LOCKOUT_DURATION)

        current = await redis.get(lockout_key)
        remaining = LOCKOUT_THRESHOLD - int(current or 1)
        if remaining <= 0:
            raise PermissionError(
                f"Akun terkunci selama 15 menit setelah {LOCKOUT_THRESHOLD} percobaan gagal"
            )
        raise ValueError(f"PIN salah. Sisa percobaan: {remaining}")

    # Success — clear lockout
    await redis.delete(lockout_key)

    # Generate tokens
    user_id = user["_id"]
    access_token = create_access_token(user_id, email_addr)
    refresh_token, jti, refresh_exp = create_refresh_token(user_id)

    # Store refresh token hash
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    await db.refresh_tokens.insert_one(
        {
            "_id": str(__import__("uuid").uuid4()),
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": refresh_exp,
        }
    )

    # Update last_login
    await db.users.update_one(
        {"_id": user_id}, {"$set": {"last_login": datetime.utcnow()}}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MIN * 60,
        "user": {
            "email": user["email"],
            "username": user["username"],
            "domain": user["domain"],
            "created_at": user["created_at"].isoformat()
            if isinstance(user["created_at"], datetime)
            else user["created_at"],
        },
    }


async def refresh_access_token(refresh_token: str) -> dict:
    """Generate a new access token using a refresh token."""
    db = get_db()

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise ValueError("Token refresh tidak valid")

    user_id = payload["sub"]

    # Verify refresh token exists in DB
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    stored = await db.refresh_tokens.find_one({"token_hash": token_hash})
    if not stored:
        raise ValueError("Token refresh tidak ditemukan atau sudah digunakan")

    # Get user email
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise ValueError("User tidak ditemukan")

    # Generate new access token
    new_access = create_access_token(user_id, user["email"])

    return {
        "access_token": new_access,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MIN * 60,
    }


async def logout_user(access_token: str, user_id: str):
    """Blacklist access token and remove refresh tokens."""
    db = get_db()

    # Blacklist the access token JTI in Redis
    payload = decode_token(access_token)
    if payload and "jti" in payload:
        remaining = get_token_remaining_seconds(access_token)
        if remaining > 0:
            await redis.set(
                f"blacklist:{payload['jti']}", "1", ex=remaining
            )

    # Delete all refresh tokens for this user
    await db.refresh_tokens.delete_many({"user_id": user_id})


async def is_token_blacklisted(jti: str) -> bool:
    """Check if a token JTI is blacklisted."""
    result = await redis.get(f"blacklist:{jti}")
    return result is not None
