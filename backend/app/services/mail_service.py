"""
RoxyMail — Mail Service
Business logic for email/inbox operations.
"""

from datetime import datetime, timedelta
from typing import Optional
import uuid

from app.database import get_db
from app.redis_client import redis
from app.utils.email_parser import parse_raw_email, detect_otp
from app.config import settings


async def process_inbound_email(data: dict) -> dict:
    """
    Process an inbound email from the Cloudflare worker webhook.
    Returns status dict.
    """
    db = get_db()

    to_address = data.get("to", "").lower().strip()
    from_address = data.get("from_field", data.get("from", "")).lower().strip()
    subject = data.get("subject", "(no subject)")
    message_id = data.get("message_id", str(uuid.uuid4()))
    raw_email = data.get("raw_email", "")

    # 1. Find user by to_address
    user = await db.users.find_one({"email": to_address})
    if not user:
        return {"status": "ignored", "reason": "unknown address"}

    # 2. Check duplicate
    existing = await db.messages.find_one({"message_id": message_id})
    if existing:
        return {"status": "duplicate", "reason": "message already exists"}

    # 3. Parse raw email
    parsed = parse_raw_email(raw_email)

    # Use parsed from info if available, fallback to header data
    actual_from_address = parsed.get("from_address") or from_address
    from_name = parsed.get("from_name", "")

    # 4. Detect OTP
    otp = detect_otp(parsed.get("body_text") or subject)
    if not otp and parsed.get("body_html"):
        # Try to detect OTP in HTML (strip tags first)
        import re
        text_from_html = re.sub(r"<[^>]+>", " ", parsed["body_html"])
        otp = detect_otp(text_from_html)

    # 5. Enforce inbox cap
    user_id = user["_id"]
    msg_count = await db.messages.count_documents({"user_id": user_id})
    if msg_count >= settings.MAX_MESSAGES_PER_INBOX:
        # Delete oldest 10 messages
        oldest = (
            db.messages.find({"user_id": user_id})
            .sort("received_at", 1)
            .limit(10)
        )
        oldest_ids = [doc["_id"] async for doc in oldest]
        if oldest_ids:
            await db.messages.delete_many({"_id": {"$in": oldest_ids}})

    # 6. Insert message
    now = datetime.utcnow()
    msg_doc = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "message_id": message_id,
        "from_address": actual_from_address,
        "from_name": from_name,
        "to_address": to_address,
        "subject": subject,
        "body_html": parsed.get("body_html"),
        "body_text": parsed.get("body_text"),
        "raw_headers": parsed.get("headers", {}),
        "otp_detected": otp,
        "is_read": False,
        "received_at": now,
        "expires_at": now + timedelta(hours=settings.MESSAGE_TTL_HOURS),
    }

    await db.messages.insert_one(msg_doc)

    # 7. Increment unread counter in Redis
    await redis.incr(f"unread:{user_id}")
    await redis.expire(f"unread:{user_id}", 86400)

    return {"status": "delivered", "message_id": msg_doc["_id"]}


async def get_inbox(
    user_id: str,
    page: int = 1,
    limit: int = 20,
    unread_only: bool = False,
    search: str = "",
) -> dict:
    """Get paginated inbox for a user."""
    db = get_db()

    query = {"user_id": user_id}

    if unread_only:
        query["is_read"] = False

    if search:
        query["$or"] = [
            {"subject": {"$regex": search, "$options": "i"}},
            {"from_address": {"$regex": search, "$options": "i"}},
            {"from_name": {"$regex": search, "$options": "i"}},
        ]

    total = await db.messages.count_documents(query)
    unread_count = await db.messages.count_documents(
        {"user_id": user_id, "is_read": False}
    )

    skip = (page - 1) * limit
    cursor = (
        db.messages.find(query)
        .sort("received_at", -1)
        .skip(skip)
        .limit(limit)
    )

    messages = []
    async for doc in cursor:
        messages.append(
            {
                "id": doc["_id"],
                "from_address": doc.get("from_address", ""),
                "from_name": doc.get("from_name", ""),
                "subject": doc.get("subject", "(no subject)"),
                "otp_detected": doc.get("otp_detected"),
                "is_read": doc.get("is_read", False),
                "received_at": doc.get("received_at", datetime.utcnow()),
            }
        )

    return {
        "messages": messages,
        "total": total,
        "page": page,
        "unread_count": unread_count,
    }


async def get_message(user_id: str, message_id: str) -> Optional[dict]:
    """Get a single message and mark as read."""
    db = get_db()

    msg = await db.messages.find_one({"_id": message_id})
    if not msg:
        return None

    # IDOR protection
    if msg["user_id"] != user_id:
        return None

    # Mark as read
    if not msg.get("is_read"):
        await db.messages.update_one(
            {"_id": message_id}, {"$set": {"is_read": True}}
        )

    return {
        "id": msg["_id"],
        "from_address": msg.get("from_address", ""),
        "from_name": msg.get("from_name", ""),
        "to_address": msg.get("to_address", ""),
        "subject": msg.get("subject", "(no subject)"),
        "body_html": msg.get("body_html"),
        "body_text": msg.get("body_text"),
        "raw_headers": msg.get("raw_headers", {}),
        "otp_detected": msg.get("otp_detected"),
        "is_read": True,
        "received_at": msg.get("received_at", datetime.utcnow()),
    }


async def delete_message(user_id: str, message_id: str) -> bool:
    """Delete a single message (with ownership check)."""
    db = get_db()

    msg = await db.messages.find_one({"_id": message_id})
    if not msg or msg["user_id"] != user_id:
        return False

    await db.messages.delete_one({"_id": message_id})
    return True


async def mark_all_as_read(user_id: str) -> int:
    """Mark all messages as read for a user."""
    db = get_db()
    result = await db.messages.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}},
    )
    return result.modified_count


async def delete_all_messages(user_id: str) -> int:
    """Delete all messages for a user."""
    db = get_db()
    result = await db.messages.delete_many({"user_id": user_id})
    return result.deleted_count


async def get_inbox_stats(user_id: str, email_addr: str) -> dict:
    """Get inbox statistics."""
    db = get_db()

    total = await db.messages.count_documents({"user_id": user_id})
    unread = await db.messages.count_documents(
        {"user_id": user_id, "is_read": False}
    )

    # Get oldest message
    oldest_msg = await db.messages.find_one(
        {"user_id": user_id}, sort=[("received_at", 1)]
    )
    oldest = oldest_msg["received_at"] if oldest_msg else None

    # Estimate storage (rough: count docs * avg size)
    pipeline = [
        {"$match": {"user_id": user_id}},
        {
            "$group": {
                "_id": None,
                "total_size": {
                    "$sum": {"$bsonSize": "$$ROOT"}
                },
            }
        },
    ]
    storage_kb = 0.0
    async for result in db.messages.aggregate(pipeline):
        storage_kb = result.get("total_size", 0) / 1024

    return {
        "total_messages": total,
        "unread_count": unread,
        "inbox_email": email_addr,
        "oldest_message": oldest,
        "storage_used_kb": round(storage_kb, 2),
    }
