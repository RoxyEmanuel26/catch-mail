"""
RoxyMail — Webhook Router
POST /api/webhook/inbound — receives emails from Cloudflare Email Worker
"""

from fastapi import APIRouter, HTTPException, Request
from app.config import settings
from app.services.mail_service import process_inbound_email

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


@router.post("/inbound")
async def inbound_email(request: Request):
    """
    Receive inbound email from Cloudflare Email Worker.
    Validates webhook secret, parses email, detects OTP, stores message.
    """
    # Validate webhook secret
    secret = request.headers.get("X-Webhook-Secret", "")
    if secret != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid webhook secret")

    # Parse request body
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Handle 'from' field (reserved keyword in Python)
    if "from" in body:
        body["from_field"] = body.pop("from")

    # Process the email
    try:
        result = await process_inbound_email(body)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
