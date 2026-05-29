"""
RoxyMail — User Model
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class UserModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    email: str
    username: str
    domain: str = "roxystore.my.id"
    pin_hash: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # None = permanent
    last_login: Optional[datetime] = None
    failed_attempts: int = 0

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
