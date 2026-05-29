"""
RoxyMail — Auth Schemas (Request/Response)
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import re


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    pin: str = Field(..., min_length=6, max_length=6)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        v = v.lower().strip()
        if not re.match(r"^[a-z0-9_]+$", v):
            raise ValueError(
                "Username hanya boleh huruf kecil, angka, dan underscore"
            )
        return v

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        if not v.isdigit():
            raise ValueError("PIN harus 6 digit angka")
        return v


class RegisterResponse(BaseModel):
    email: str
    username: str
    domain: str
    created_at: datetime


class LoginRequest(BaseModel):
    email: str
    pin: str = Field(..., min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        return v.lower().strip()


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int


class UserInfo(BaseModel):
    email: str
    username: str
    domain: str
    created_at: Optional[datetime] = None
