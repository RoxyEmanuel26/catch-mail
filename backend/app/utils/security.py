"""
RoxyMail — Security Utilities
JWT creation/verification and bcrypt PIN hashing.
"""

from datetime import datetime, timedelta
from typing import Optional
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)


def hash_pin(pin: str) -> str:
    """Hash a 6-digit PIN with bcrypt."""
    return pwd_context.hash(pin)


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verify a PIN against its hash."""
    return pwd_context.verify(plain_pin, hashed_pin)


def create_access_token(
    user_id: str, email: str, expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MIN)
    )
    payload = {
        "sub": user_id,
        "email": email,
        "jti": str(uuid.uuid4()),
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(
    user_id: str, expires_delta: Optional[timedelta] = None
) -> tuple[str, str, datetime]:
    """Create a JWT refresh token. Returns (token, jti, expires_at)."""
    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "jti": jti,
        "exp": expire,
        "type": "refresh",
    }
    token = jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return token, jti, expire


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def get_token_remaining_seconds(token: str) -> int:
    """Get the remaining seconds until a token expires."""
    payload = decode_token(token)
    if not payload or "exp" not in payload:
        return 0
    exp = datetime.utcfromtimestamp(payload["exp"])
    remaining = (exp - datetime.utcnow()).total_seconds()
    return max(0, int(remaining))
