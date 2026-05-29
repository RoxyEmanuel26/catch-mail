"""
RoxyMail — Auth Router
/api/auth/* endpoints: register, login, refresh, logout
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from app.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
)
from app.services.auth_service import (
    register_user,
    login_user,
    refresh_access_token,
    logout_user,
    is_token_blacklisted,
)
from app.utils.security import decode_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_current_user(request: Request) -> dict:
    """Dependency to extract and validate the current user from JWT."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token diperlukan")

    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token tidak valid atau expired")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Tipe token tidak valid")

    # Check blacklist
    jti = payload.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise HTTPException(status_code=401, detail="Token sudah di-logout")

    return {
        "user_id": payload["sub"],
        "email": payload.get("email", ""),
        "token": token,
    }


@router.post("/register", response_model=RegisterResponse)
async def register(data: RegisterRequest):
    """Register a new email address with custom username."""
    try:
        result = await register_user(data.username, data.pin)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest):
    """Login with email + PIN."""
    try:
        result = await login_user(data.email, data.pin)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(data: RefreshRequest):
    """Refresh access token."""
    try:
        result = await refresh_access_token(data.refresh_token)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout: Blacklist token and delete refresh tokens."""
    await logout_user(current_user["token"], current_user["user_id"])
    return {"message": "Berhasil logout"}
