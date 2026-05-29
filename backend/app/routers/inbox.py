"""
RoxyMail — Inbox Router
/api/inbox/* endpoints: list, get, delete, stats
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from app.routers.auth import get_current_user
from app.services.mail_service import (
    get_inbox,
    get_message,
    delete_message,
    delete_all_messages,
    mark_all_as_read,
    get_inbox_stats,
)

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


@router.get("")
async def list_inbox(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    search: str = Query(""),
    current_user: dict = Depends(get_current_user),
):
    """Get paginated inbox for the current user."""
    result = await get_inbox(
        user_id=current_user["user_id"],
        page=page,
        limit=limit,
        unread_only=unread_only,
        search=search,
    )
    return result


@router.get("/stats")
async def inbox_stats(current_user: dict = Depends(get_current_user)):
    """Get inbox statistics."""
    result = await get_inbox_stats(
        user_id=current_user["user_id"],
        email_addr=current_user["email"],
    )
    return result


@router.get("/{message_id}")
async def read_message(
    message_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single message by ID (also marks as read)."""
    result = await get_message(
        user_id=current_user["user_id"],
        message_id=message_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Pesan tidak ditemukan")
    return result


@router.delete("/{message_id}")
async def remove_message(
    message_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a single message."""
    success = await delete_message(
        user_id=current_user["user_id"],
        message_id=message_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Pesan tidak ditemukan")
    return {"deleted_count": 1}


@router.put("/read-all")
async def mark_all_read(
    current_user: dict = Depends(get_current_user),
):
    """Mark all messages as read for the current user."""
    count = await mark_all_as_read(user_id=current_user["user_id"])
    return {"marked_count": count}


@router.delete("")
async def remove_all_messages(
    current_user: dict = Depends(get_current_user),
):
    """Delete all messages for the current user."""
    count = await delete_all_messages(user_id=current_user["user_id"])
    return {"deleted_count": count}
