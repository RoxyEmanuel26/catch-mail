"""
RoxyMail — Auth Service
Business logic for authentication operations.
"""

from datetime import datetime, timezone
import hashlib
import uuid

from app.database import get_db
from app.redis_client import redis, RedisConnectionError
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


async def register_user(username: str, pin: str, domain: str = None) -> dict:
    """Register a new user with email, PIN, and custom domain."""
    db = get_db()
    
    # Normalize inputs in service layer (H9)
    username = username.lower().strip()
    if not domain:
        domain = settings.DOMAIN
    domain = domain.lower().strip()

    # Verify domain is allowed
    if domain not in settings.allowed_domains_list:
        raise ValueError("Domain tidak didukung")

    email_addr = f"{username}@{domain}"

    # Check if email already exists
    existing = await db.users.find_one({"email": email_addr})
    if existing:
        if existing.get("pin_hash") is None:
            # Claim the auto-created account
            now = datetime.now(timezone.utc)
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "pin_hash": hash_pin(pin),
                    "is_active": True,
                    "created_at": now
                }}
            )
            return {
                "email": email_addr,
                "username": username,
                "domain": domain,
                "created_at": now,
            }
        else:
            raise ValueError("Email sudah terdaftar")

    user_doc = {
        "_id": str(uuid.uuid4()),
        "email": email_addr,
        "username": username,
        "domain": domain,
        "pin_hash": hash_pin(pin),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "expires_at": None,
        "last_login": None,
        "failed_attempts": 0,
    }

    await db.users.insert_one(user_doc)

    return {
        "email": email_addr,
        "username": username,
        "domain": domain,
        "created_at": user_doc["created_at"],
    }


async def login_user(email_addr: str, pin: str) -> dict:
    """Authenticate user and return tokens."""
    db = get_db()
    email_addr = email_addr.lower().strip()

    # Check Redis lockout
    lockout_key = f"lockout:{email_addr}"
    try:
        lockout_count = await redis.get(lockout_key)
    except Exception:
        # Fail-open for lockout check if Redis is down (so users aren't locked out of login)
        lockout_count = None

    if lockout_count and int(lockout_count) >= LOCKOUT_THRESHOLD:
        try:
            ttl = await redis.ttl(lockout_key)
        except Exception:
            ttl = LOCKOUT_DURATION
        raise PermissionError(f"Akun terkunci. Coba lagi dalam {ttl or LOCKOUT_DURATION} detik")

    # Find user
    user = await db.users.find_one({"email": email_addr})
    if not user:
        raise ValueError("Email tidak ditemukan")
        
    if not user.get("pin_hash"):
        raise ValueError("Email ini menampung pesan tetapi belum diklaim. Silakan daftar (Register) terlebih dahulu.")

    # Verify PIN
    if not verify_pin(pin, user["pin_hash"]):
        # Increment failed attempts
        try:
            await redis.incr(lockout_key)
            await redis.expire(lockout_key, LOCKOUT_DURATION)
            current = await redis.get(lockout_key)
            remaining = LOCKOUT_THRESHOLD - int(current or 1)
        except Exception:
            # Fallback if Redis is down
            remaining = 0

        if remaining <= 0:
            raise PermissionError(
                f"Akun terkunci selama 15 menit setelah {LOCKOUT_THRESHOLD} percobaan gagal"
            )
        raise ValueError(f"PIN salah. Sisa percobaan: {remaining}")

    # Success — clear lockout
    try:
        await redis.delete(lockout_key)
    except Exception:
        pass

    # Generate tokens
    user_id = user["_id"]
    access_token = create_access_token(user_id, email_addr)
    refresh_token, jti, refresh_exp = create_refresh_token(user_id)

    # Store refresh token hash
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    await db.refresh_tokens.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": refresh_exp,
        }
    )

    # Update last_login
    await db.users.update_one(
        {"_id": user_id}, {"$set": {"last_login": datetime.now(timezone.utc)}}
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
    """Generate a new access token and rotate the refresh token (RTR)."""
    db = get_db()

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise ValueError("Token refresh tidak valid")

    user_id = payload["sub"]

    # Verify refresh token exists in DB
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    stored = await db.refresh_tokens.find_one({"token_hash": token_hash})
    if not stored:
        # Replay attack protection: revoke all refresh tokens for this user
        await db.refresh_tokens.delete_many({"user_id": user_id})
        raise ValueError("Token refresh tidak ditemukan atau sudah digunakan")

    # Get user email
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise ValueError("User tidak ditemukan")

    # Rotate: delete old refresh token
    await db.refresh_tokens.delete_one({"_id": stored["_id"]})

    # Generate new tokens
    new_access = create_access_token(user_id, user["email"])
    new_refresh, new_jti, new_refresh_exp = create_refresh_token(user_id)

    # Store new refresh token hash
    new_token_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
    await db.refresh_tokens.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "token_hash": new_token_hash,
            "expires_at": new_refresh_exp,
        }
    )

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
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
            try:
                await redis.set(
                    f"blacklist:{payload['jti']}", "1", ex=remaining
                )
            except Exception:
                # Log error but proceed to delete refresh tokens
                pass

    # Delete all refresh tokens for this user
    await db.refresh_tokens.delete_many({"user_id": user_id})


async def is_token_blacklisted(jti: str) -> bool:
    """Check if a token JTI is blacklisted. Fails closed (returns True) on Redis failure."""
    try:
        result = await redis.get(f"blacklist:{jti}")
        return result is not None
    except Exception:
        # Fail closed on Redis error for token verification (reject token)
        return True
