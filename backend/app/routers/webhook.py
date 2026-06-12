"""
RoxyMail — Webhook Router
POST /api/webhook/inbound — receives emails from Cloudflare Email Worker
"""

import hmac
import logging
from fastapi import APIRouter, HTTPException, Request
from app.config import settings
from app.services.mail_service import process_inbound_email
from app.middleware.rate_limiter import limiter

router = APIRouter(prefix="/api/webhook", tags=["webhook"])
logger = logging.getLogger("app.webhook")


@router.post("/inbound")
@limiter.limit("60/minute")
async def inbound_email(request: Request):
    """
    Receive inbound email from Cloudflare Email Worker.
    Validates webhook secret, parses email, detects OTP, stores message.
    """
    # 1. Validate webhook secret with timing attack protection (C7)
    secret = request.headers.get("X-Webhook-Secret", "")
    if not hmac.compare_digest(secret, settings.WEBHOOK_SECRET):
        raise HTTPException(status_code=403, detail="Invalid webhook secret")

    # 2. Limit request body size (L15)
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > 10 * 1024 * 1024:  # 10MB
                raise HTTPException(status_code=413, detail="Payload too large")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header")

    # 3. Parse request body
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Handle 'from' field (reserved keyword in Python)
    if "from" in body:
        body["from_field"] = body.pop("from")

    # 4. Process the email (M7)
    try:
        result = await process_inbound_email(body)
        return result
    except Exception as e:
        logger.exception("Error processing inbound email webhook")
        raise HTTPException(status_code=500, detail="Error processing email")
