"""
RoxyMail — Mail Service
Business logic for email/inbox operations.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
import re
from pymongo.errors import DuplicateKeyError

from app.database import get_db
from app.redis_client import redis
from app.utils.email_parser import parse_raw_email, detect_otp
from app.config import settings


async def decrement_unread(user_id: str):
    """Safely decrement unread counter in Redis, deleting the key if count drops to 0 or less."""
    unread_key = f"unread:{user_id}"
    try:
        count = await redis.get(unread_key)
        if count:
            val = int(count)
            if val > 1:
                await redis.decr(unread_key)
            else:
                await redis.delete(unread_key)
    except Exception:
        pass


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

    # 1. Parse domain and validate (C8, C9)
    if "@" not in to_address:
        return {"status": "rejected", "reason": "invalid to_address format"}
    
    username, domain = to_address.rsplit("@", 1)
    
    if domain not in settings.allowed_domains_list:
        return {"status": "rejected", "reason": "domain not allowed"}

    # 2. Find user by to_address
    user = await db.users.find_one({"email": to_address})
    if not user:
        # Auto-create unclaimed user inbox
        user = {
            "_id": str(uuid.uuid4()),
            "email": to_address,
            "username": username,
            "domain": domain,
            "pin_hash": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "expires_at": None,
            "last_login": None,
            "failed_attempts": 0,
        }
        try:
            await db.users.insert_one(user)
        except DuplicateKeyError:
            # Race condition: user was created concurrently (H4)
            user = await db.users.find_one({"email": to_address})
            if not user:
                raise RuntimeError("Failed to retrieve or create user inbox")

    # 3. Check duplicate message
    existing = await db.messages.find_one({"message_id": message_id})
    if existing:
        return {"status": "duplicate", "reason": "message already exists"}

    # 4. Parse raw email
    parsed = parse_raw_email(raw_email)

    # Use parsed from info if available, fallback to header data
    actual_from_address = parsed.get("from_address") or from_address
    from_name = parsed.get("from_name", "")

    # 5. Detect OTP
    otp = detect_otp(parsed.get("body_text") or subject)
    if not otp and parsed.get("body_html"):
        # Try to detect OTP in HTML (strip tags first)
        text_from_html = re.sub(r"<[^>]+>", " ", parsed["body_html"])
        otp = detect_otp(text_from_html)

    # 6. Enforce inbox cap
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

    # 7. Insert message
    now = datetime.now(timezone.utc)
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

    try:
        await db.messages.insert_one(msg_doc)
    except DuplicateKeyError:
        # Race condition: message was inserted concurrently (H5)
        return {"status": "duplicate", "reason": "message already exists"}

    # 8. Increment unread counter in Redis
    try:
        await redis.incr(f"unread:{user_id}")
        await redis.expire(f"unread:{user_id}", 86400)
    except Exception:
        pass

    return {"status": "delivered", "message_id": msg_doc["_id"]}


async def get_inbox(
    user_id: str,
    page: int = 1,
    limit: int = 20,
    unread_only: bool = False,
    search: str = "",
    otp_only: bool = False,
) -> dict:
    """Get paginated inbox for a user."""
    db = get_db()

    query = {"user_id": user_id}

    if unread_only:
        query["is_read"] = False

    if otp_only:
        query["otp_detected"] = {"$ne": None}

    if search:
        # Escape regex input (H3)
        safe_search = re.escape(search)
        query["$or"] = [
            {"subject": {"$regex": safe_search, "$options": "i"}},
            {"from_address": {"$regex": safe_search, "$options": "i"}},
            {"from_name": {"$regex": safe_search, "$options": "i"}},
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
                "received_at": doc.get("received_at", datetime.now(timezone.utc)),
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

    # Mark as read and decrement unread count (M3)
    if not msg.get("is_read"):
        await db.messages.update_one(
            {"_id": message_id}, {"$set": {"is_read": True}}
        )
        await decrement_unread(user_id)

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
        "received_at": msg.get("received_at", datetime.now(timezone.utc)),
    }


async def delete_message(user_id: str, message_id: str) -> bool:
    """Delete a single message in a single round-trip (L16) and decrement unread if needed."""
    db = get_db()

    # find_one_and_delete executes in a single round-trip and returns the deleted doc
    deleted_msg = await db.messages.find_one_and_delete({"_id": message_id, "user_id": user_id})
    if not deleted_msg:
        return False

    if not deleted_msg.get("is_read", False):
        await decrement_unread(user_id)

    return True


async def mark_all_as_read(user_id: str) -> int:
    """Mark all messages as read for a user and clear unread key."""
    db = get_db()
    result = await db.messages.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}},
    )
    try:
        await redis.delete(f"unread:{user_id}")
    except Exception:
        pass
    return result.modified_count


async def delete_all_messages(user_id: str) -> int:
    """Delete all messages for a user and clear unread key."""
    db = get_db()
    result = await db.messages.delete_many({"user_id": user_id})
    try:
        await redis.delete(f"unread:{user_id}")
    except Exception:
        pass
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
