"""
RoxyMail — Message Model
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class MessageModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    user_id: str
    message_id: str  # Email header Message-ID
    from_address: str
    from_name: str = ""
    to_address: str
    subject: str = "(no subject)"
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    raw_headers: Dict[str, Any] = Field(default_factory=dict)
    otp_detected: Optional[str] = None
    is_read: bool = False
    received_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
