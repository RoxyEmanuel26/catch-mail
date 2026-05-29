"""
RoxyMail — Message Schemas (Request/Response)
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class InboundEmailRequest(BaseModel):
    raw_email: str
    from_field: str = ""  # 'from' is reserved in Python
    to: str = ""
    subject: str = "(no subject)"
    date: str = ""
    message_id: str = ""

    class Config:
        # Allow 'from' field in JSON
        populate_by_name = True

    def __init__(self, **data):
        # Handle 'from' key from JSON
        if "from" in data:
            data["from_field"] = data.pop("from")
        super().__init__(**data)


class MessageSummary(BaseModel):
    id: str
    from_address: str
    from_name: str
    subject: str
    otp_detected: Optional[str] = None
    is_read: bool
    received_at: datetime


class MessageDetail(BaseModel):
    id: str
    from_address: str
    from_name: str
    to_address: str
    subject: str
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    raw_headers: Dict[str, Any] = {}
    otp_detected: Optional[str] = None
    is_read: bool
    received_at: datetime


class InboxResponse(BaseModel):
    messages: List[MessageSummary]
    total: int
    page: int
    unread_count: int


class InboxStatsResponse(BaseModel):
    total_messages: int
    unread_count: int
    inbox_email: str
    oldest_message: Optional[datetime] = None
    storage_used_kb: float = 0.0


class WebhookResponse(BaseModel):
    status: str
    message_id: Optional[str] = None
    reason: Optional[str] = None


class DeleteResponse(BaseModel):
    deleted_count: int
